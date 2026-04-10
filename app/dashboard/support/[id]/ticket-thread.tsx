"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Wand2 } from "lucide-react";
import type { TicketMessage } from "@/lib/types";

export function TicketThread({
  ticketId,
  initialMessages,
  operatorName,
  currentStatus,
  currentPriority,
}: {
  ticketId: string;
  initialMessages: TicketMessage[];
  operatorName: string;
  currentStatus: string;
  currentPriority: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<TicketMessage[]>(initialMessages);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [priority, setPriority] = useState(currentPriority);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

  // Get the first message from renter (ticket content)
  const ticketSubject = messages.find((m) => m.sender_type === "renter")?.content || "";

  async function suggestAIResponse() {
    if (aiSuggestLoading) return;
    setAiSuggestLoading(true);

    try {
      const response = await fetch("/api/support/auto-resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          subject: "Support Ticket",
          message: ticketSubject,
        }),
      });

      const data = await response.json();
      if (data.resolved && data.response) {
        setReply(data.response);
      } else {
        alert(
          "Could not generate a suggestion. Please write a response manually."
        );
      }
    } catch (err) {
      console.error("AI suggestion error:", err);
      alert("Error getting AI suggestion. Please try again.");
    } finally {
      setAiSuggestLoading(false);
      router.refresh();
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);

    const { data, error } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_type: "operator",
        sender_name: operatorName,
        content: reply.trim(),
      })
      .select()
      .single();

    if (data) {
      setMessages((prev) => [...prev, data as TicketMessage]);
      setReply("");
    }

    // Update ticket updated_at
    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    setSending(false);
  }

  async function updateStatus(newStatus: string) {
    setStatus(newStatus);
    await supabase
      .from("support_tickets")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);
    router.refresh();
  }

  async function updatePriority(newPriority: string) {
    setPriority(newPriority);
    await supabase
      .from("support_tickets")
      .update({
        priority: newPriority,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select value={status} onValueChange={(val) => { if (val) updateStatus(val); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Priority:</span>
            <Select value={priority} onValueChange={(val) => { if (val) updatePriority(val); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardContent className="p-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages yet.
            </p>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.sender_type === "operator"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.sender_type === "operator"
                    ? "bg-[#2EBD6B]/10 text-foreground"
                    : "bg-slate-100 text-foreground"
                }`}
              >
                <p className="text-xs font-medium mb-1">
                  {msg.sender_name}
                  <span className="text-muted-foreground font-normal ml-2">
                    {msg.sender_type === "operator" ? "(You)" : "(Renter)"}
                  </span>
                </p>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Reply Form */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardContent className="p-4 space-y-3">
          <Textarea
            placeholder="Type your reply..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2 justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={suggestAIResponse}
              disabled={aiSuggestLoading}
              className="gap-2"
            >
              <Wand2 className="h-4 w-4" />
              {aiSuggestLoading ? "Generating..." : "AI Suggest Response"}
            </Button>
            <Button
              type="submit"
              onClick={sendReply}
              disabled={sending || !reply.trim()}
              style={{ backgroundColor: "#2EBD6B" }}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending..." : "Reply"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
