"use client";

/**
 * Live support chat — talks to /api/support/chat.
 * Polls for delayed agent replies and shows a typing indicator while a
 * response is "being written" (deliver_after in the future).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "operator" | "agent" | "system";
  content: string;
  agent_name: string | null;
  created_at: string;
}

export function SupportChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (convoId: string | null) => {
    const url = convoId
      ? `/api/support/chat?conversation_id=${convoId}`
      : "/api/support/chat";
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    if (!convoId) {
      if (data.conversation?.id) {
        setConversationId(data.conversation.id);
      }
      return;
    }
    setMessages(data.messages ?? []);
    setPending(!!data.pending);
  }, []);

  // Initial: find existing open conversation
  useEffect(() => {
    load(null);
  }, [load]);

  // Poll while a conversation is open
  useEffect(() => {
    if (!conversationId) return;
    load(conversationId);
    pollRef.current = setInterval(() => load(conversationId), 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversationId, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    // optimistic append
    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        role: "operator",
        content: text,
        agent_name: null,
        created_at: new Date().toISOString(),
      },
    ]);
    setPending(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversation_id: conversationId }),
      });
      const data = await res.json();
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
            <MessageCircle className="h-4 w-4 text-[#2EBD6B]" />
          </span>
          Chat with Support
          <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-emerald-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Online
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[420px] flex-col rounded-lg border border-gray-100 bg-[#F8F9FC]">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && !pending && (
              <div className="mt-16 text-center text-sm text-gray-400">
                Hi there! Ask us anything about your account, bookings, or the
                platform. A member of the support team will reply right here.
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "operator" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "operator"
                      ? "rounded-br-md bg-[#2EBD6B] text-white"
                      : "rounded-bl-md border border-gray-100 bg-white text-gray-800 shadow-sm"
                  }`}
                >
                  {m.role === "agent" && m.agent_name && (
                    <div className="mb-1 text-[11px] font-semibold text-[#2EBD6B]">
                      {m.agent_name}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-gray-100 bg-white p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type your message…"
              className="flex-1 rounded-lg border border-gray-200 bg-[#F8F9FC] px-3 py-2 text-sm outline-none focus:border-[#2EBD6B]"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2EBD6B] text-white transition-opacity disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          Typical reply time: under a minute. Complex issues may be handed to a
          senior specialist.
        </p>
      </CardContent>
    </Card>
  );
}
