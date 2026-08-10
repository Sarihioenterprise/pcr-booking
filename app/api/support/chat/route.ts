/**
 * /api/support/chat — AI support agent conversations.
 *
 * POST { message, conversation_id? } → persists operator message, runs agent,
 *   stores reply with a human-like deliver_after delay. Returns conversation_id.
 * GET  ?conversation_id=… → messages whose deliver_after has passed, plus
 *   pending=true when a reply is still "being typed".
 *
 * Auth: operator session (getOperator). All agent tools are hard-scoped to
 * the session operator server-side; model output can never select a tenant.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import {
  PERSONAS,
  TOOL_DEFINITIONS,
  buildAccountSnapshot,
  executeTool,
  replyDelaySeconds,
  systemPrompt,
} from "@/lib/support-agent";

export const maxDuration = 60;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireOperator(): Promise<any | NextResponse> {
  try {
    return await getOperator();
  } catch (err: unknown) {
    const digest = (err as { digest?: string }).digest ?? "";
    if (digest.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }
}

export async function GET(request: NextRequest) {
  const operator = await requireOperator();
  if (operator instanceof NextResponse) return operator;

  const supabase = createAdminClient();
  const conversationId = request.nextUrl.searchParams.get("conversation_id");

  if (!conversationId) {
    // Latest open conversation for this operator, if any
    const { data: convo } = await supabase
      .from("support_conversations")
      .select("id, status, agent_tier")
      .eq("operator_id", operator.id)
      .neq("status", "closed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json({ conversation: convo ?? null });
  }

  // Scope check: conversation must belong to this operator
  const { data: convo } = await supabase
    .from("support_conversations")
    .select("id, status, agent_tier")
    .eq("id", conversationId)
    .eq("operator_id", operator.id)
    .maybeSingle();
  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const nowIso = new Date().toISOString();
  const { data: visible } = await supabase
    .from("support_conversation_messages")
    .select("id, role, content, agent_name, created_at, deliver_after")
    .eq("conversation_id", conversationId)
    .lte("deliver_after", nowIso)
    .order("created_at", { ascending: true });

  const { count: pendingCount } = await supabase
    .from("support_conversation_messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversationId)
    .gt("deliver_after", nowIso);

  return NextResponse.json({
    conversation: convo,
    messages: visible ?? [],
    pending: (pendingCount ?? 0) > 0,
  });
}

export async function POST(request: NextRequest) {
  const operator = await requireOperator();
  if (operator instanceof NextResponse) return operator;

  const supabase = createAdminClient();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Support agent not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const message = String(body.message ?? "").trim().slice(0, 4000);
  if (!message) return NextResponse.json({ error: "message is required" }, { status: 400 });

  // Simple rate limit: max 30 operator messages per hour per account
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count: recentCount } = await supabase
    .from("support_conversation_messages")
    .select("id, support_conversations!inner(operator_id)", { count: "exact", head: true })
    .eq("role", "operator")
    .eq("support_conversations.operator_id", operator.id)
    .gte("created_at", hourAgo);
  if ((recentCount ?? 0) > 30) {
    return NextResponse.json({ error: "Rate limit reached. Please try again shortly or email support@pcrbooking.com." }, { status: 429 });
  }

  // Find or create conversation (scoped to operator)
  let conversationId = String(body.conversation_id ?? "");
  let tier: "frontline" | "specialist" = "frontline";
  if (conversationId) {
    const { data: convo } = await supabase
      .from("support_conversations")
      .select("id, agent_tier, status")
      .eq("id", conversationId)
      .eq("operator_id", operator.id)
      .maybeSingle();
    if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    tier = convo.agent_tier as typeof tier;
  } else {
    const { data: convo, error } = await supabase
      .from("support_conversations")
      .insert({ operator_id: operator.id })
      .select("id")
      .single();
    if (error || !convo) return NextResponse.json({ error: "Could not start conversation" }, { status: 500 });
    conversationId = convo.id;
  }

  // Persist operator message
  await supabase.from("support_conversation_messages").insert({
    conversation_id: conversationId,
    role: "operator",
    content: message,
  });

  // Build model context: last 30 messages
  const { data: history } = await supabase
    .from("support_conversation_messages")
    .select("role, content, agent_name")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(30);

  const snapshot = await buildAccountSnapshot(operator);
  const chat: Array<Record<string, unknown>> = [
    { role: "system", content: systemPrompt(tier, snapshot) },
    ...(history ?? []).map((m) => ({
      role: m.role === "operator" ? "user" : "assistant",
      content: m.content,
    })),
  ];

  const isFirstReply = !(history ?? []).some((m) => m.role === "agent");

  // Agent loop with tool calls (max 4 rounds)
  let finalText = "";
  let currentTier: "frontline" | "specialist" = tier;
  try {
    for (let round = 0; round < 4; round++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: PERSONAS[currentTier].model,
          messages: chat,
          tools: TOOL_DEFINITIONS,
          temperature: 0.7,
          max_tokens: 700,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}`);
      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      if (!choice) throw new Error("No completion");

      if (choice.tool_calls?.length) {
        chat.push(choice);
        for (const tc of choice.tool_calls) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* empty */ }
          const out = await executeTool(tc.function.name, args, operator, conversationId);
          if (out.specialistRequested) currentTier = "specialist";
          chat.push({ role: "tool", tool_call_id: tc.id, content: out.result });
        }
        continue;
      }

      finalText = String(choice.content ?? "").trim();
      break;
    }
  } catch (err) {
    console.error("Support agent error:", err);
    finalText = "Sorry, I'm having trouble on my end right now. I've flagged this so the team can follow up with you by email shortly.";
  }

  if (!finalText) {
    finalText = "Let me look into that and get back to you here in just a bit.";
  }

  // Human-like delayed delivery
  const delay = replyDelaySeconds(currentTier, isFirstReply || currentTier !== tier);
  const deliverAfter = new Date(Date.now() + delay * 1000).toISOString();
  const persona = PERSONAS[currentTier];

  await supabase.from("support_conversation_messages").insert({
    conversation_id: conversationId,
    role: "agent",
    content: finalText,
    agent_name: `${persona.name} · ${persona.title}`,
    deliver_after: deliverAfter,
  });
  await supabase
    .from("support_conversations")
    .update({ updated_at: new Date().toISOString(), agent_tier: currentTier })
    .eq("id", conversationId);

  return NextResponse.json({ conversation_id: conversationId, pending: true });
}
