"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  HeadphonesIcon,
  MessageSquare,
  Send,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface TicketMessage {
  id: string;
  sender_type: "renter" | "operator";
  sender_name: string;
  content: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
  ticket_messages?: TicketMessage[];
}

const statusColors: Record<string, string> = {
  open: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function PortalSupportPage() {
  const { bookingId } = useParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);

  // New ticket form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reply form
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadTickets();
  }, [bookingId]);

  async function loadTickets() {
    const res = await fetch(`/api/portal/${bookingId}/ticket`);
    if (res.ok) {
      const data = await res.json();
      setTickets(data);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);

    const res = await fetch(`/api/portal/${bookingId}/ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
    });

    if (res.ok) {
      setSubject("");
      setMessage("");
      await loadTickets();
    }

    setSubmitting(false);
  }

  async function openTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    // Load messages
    const res = await fetch(
      `/api/portal/${bookingId}/ticket/${ticket.id}/messages`
    );
    if (res.ok) {
      const data = await res.json();
      setMessages(data);
    }
  }

  async function sendReplyMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !selectedTicket) return;
    setSendingReply(true);

    const res = await fetch(
      `/api/portal/${bookingId}/ticket/${selectedTicket.id}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reply.trim() }),
      }
    );

    if (res.ok) {
      const newMsg = await res.json();
      setMessages((prev) => [...prev, newMsg]);
      setReply("");
    }

    setSendingReply(false);
  }

  if (loading) {
    return (
      <div className="text-muted-foreground text-center py-12">
        Loading...
      </div>
    );
  }

  // Thread view
  if (selectedTicket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedTicket(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{selectedTicket.subject}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className={statusColors[selectedTicket.status] || ""}
              >
                {selectedTicket.status.replace("_", " ")}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Opened{" "}
                {new Date(selectedTicket.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender_type === "renter"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.sender_type === "renter"
                      ? "bg-[#2EBD6B]/10 text-foreground"
                      : "bg-slate-100 text-foreground"
                  }`}
                >
                  <p className="text-xs font-medium mb-1">
                    {msg.sender_name}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No messages yet.
              </p>
            )}
          </CardContent>
        </Card>

        {selectedTicket.status !== "resolved" && (
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="p-4">
              <form
                onSubmit={sendReplyMessage}
                className="flex items-end gap-3"
              >
                <div className="flex-1">
                  <Textarea
                    placeholder="Type your reply..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={2}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={sendingReply || !reply.trim()}
                  style={{ backgroundColor: "#2EBD6B" }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/portal/${bookingId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Support</h1>
          <p className="text-muted-foreground">
            Submit a ticket or view existing ones
          </p>
        </div>
      </div>

      {/* New Ticket Form */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeadphonesIcon className="h-5 w-5 text-[#2EBD6B]" />
            Submit a Ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="What do you need help with?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Describe your issue..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              style={{ backgroundColor: "#2EBD6B" }}
            >
              {submitting ? "Submitting..." : "Submit Ticket"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing Tickets */}
      {tickets.length > 0 && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle>Your Tickets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => openTicket(ticket)}
                  className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{ticket.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={statusColors[ticket.status] || ""}
                      >
                        {ticket.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
