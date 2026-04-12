"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Loader2, TicketCheck, ChevronDown } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  shouldEscalate?: boolean;
}

interface TicketForm {
  subject: string;
  message: string;
  submitting: boolean;
  submitted: boolean;
  ticketId?: string;
  error?: string;
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      text: "Hi! I'm your PCR Booking assistant. Ask me anything about your account or how to use the platform.",
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ticketForms, setTicketForms] = useState<Record<string, TicketForm>>({});
  const [openTicketFormId, setOpenTicketFormId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Build conversation history (last 10, exclude initial greeting)
  function buildHistory(msgs: Message[]) {
    return msgs
      .filter((m) => m.id !== "0")
      .slice(-10)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));
  }

  // Derive a topic from the last few messages for pre-filling the ticket subject
  function deriveTicketSubject(msgs: Message[]): string {
    const userMsgs = msgs.filter((m) => m.sender === "user");
    if (userMsgs.length === 0) return "Support Request";
    const last = userMsgs[userMsgs.length - 1].text;
    return last.length > 60 ? last.slice(0, 57) + "..." : last;
  }

  // Derive a summary for the ticket message
  function deriveTicketMessage(msgs: Message[]): string {
    const relevant = msgs.filter((m) => m.id !== "0").slice(-6);
    if (relevant.length === 0) return "";
    return relevant
      .map((m) => `${m.sender === "user" ? "Me" : "Assistant"}: ${m.text}`)
      .join("\n\n");
  }

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, open, openTicketFormId]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), text, sender: "user" };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const history = buildHistory(newMessages.slice(0, -1)); // history before this message
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: history,
        }),
      });

      const data = await res.json();
      const botId = (Date.now() + 1).toString();
      const botMsg: Message = {
        id: botId,
        text:
          data.reply ||
          "Sorry, something went wrong. Please try submitting a support ticket.",
        sender: "bot",
        shouldEscalate: data.shouldEscalate === true,
      };
      const updatedMessages = [...newMessages, botMsg];
      setMessages(updatedMessages);

      // Pre-populate ticket form if escalation is suggested
      if (data.shouldEscalate) {
        setTicketForms((prev) => ({
          ...prev,
          [botId]: {
            subject: deriveTicketSubject(updatedMessages),
            message: deriveTicketMessage(updatedMessages),
            submitting: false,
            submitted: false,
          },
        }));
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Something went wrong on my end. Please try again or submit a support ticket.",
          sender: "bot",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleOpenTicketForm(msgId: string) {
    setOpenTicketFormId((prev) => (prev === msgId ? null : msgId));
  }

  function updateTicketForm(msgId: string, updates: Partial<TicketForm>) {
    setTicketForms((prev) => ({
      ...prev,
      [msgId]: { ...prev[msgId], ...updates },
    }));
  }

  async function submitTicket(msgId: string) {
    const form = ticketForms[msgId];
    if (!form || !form.subject.trim() || !form.message.trim()) return;

    updateTicketForm(msgId, { submitting: true, error: undefined });

    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        updateTicketForm(msgId, {
          submitted: true,
          submitting: false,
          ticketId: data.ticketId,
        });
        setOpenTicketFormId(null);
      } else {
        updateTicketForm(msgId, {
          submitting: false,
          error: data.error || "Failed to submit ticket. Please try again.",
        });
      }
    } catch {
      updateTicketForm(msgId, {
        submitting: false,
        error: "Network error. Please try again.",
      });
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 bg-[#2EBD6B] hover:bg-[#1a9952] text-white px-4 py-3 rounded-full shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/50 focus:ring-offset-2"
        aria-label={open ? "Close support chat" : "Open support chat"}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
        {!open && <span className="text-sm font-semibold">Support</span>}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-20 right-3 left-3 sm:left-auto sm:right-6 sm:w-96 z-50 rounded-2xl shadow-2xl bg-white border border-gray-200 flex flex-col overflow-hidden"
          style={{ maxHeight: "calc(100vh - 120px)", height: "500px" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#2EBD6B] flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">PCR Support</p>
              <p className="text-xs text-white/80">AI-powered · always on</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto p-1 rounded hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <div
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.sender === "user"
                        ? "bg-[#2EBD6B] text-white rounded-br-sm"
                        : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Escalation button */}
                {msg.shouldEscalate && ticketForms[msg.id] && (
                  <div className="flex justify-start">
                    <div className="max-w-[82%] space-y-2">
                      {ticketForms[msg.id].submitted ? (
                        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                          <TicketCheck className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            Ticket submitted! Our team will get back to you soon.
                          </span>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenTicketForm(msg.id)}
                            className="flex items-center gap-1.5 text-xs text-[#2EBD6B] bg-white border border-[#2EBD6B] rounded-xl px-3 py-1.5 hover:bg-[#2EBD6B]/5 transition-colors font-medium"
                          >
                            <TicketCheck className="h-3.5 w-3.5" />
                            Open Support Ticket
                            <ChevronDown
                              className={`h-3 w-3 transition-transform ${
                                openTicketFormId === msg.id ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {openTicketFormId === msg.id && (
                            <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2 shadow-sm">
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">
                                  Subject
                                </label>
                                <input
                                  type="text"
                                  value={ticketForms[msg.id].subject}
                                  onChange={(e) =>
                                    updateTicketForm(msg.id, { subject: e.target.value })
                                  }
                                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/40 focus:border-[#2EBD6B]"
                                  placeholder="Brief description of your issue"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 block mb-1">
                                  Details
                                </label>
                                <textarea
                                  value={ticketForms[msg.id].message}
                                  onChange={(e) =>
                                    updateTicketForm(msg.id, { message: e.target.value })
                                  }
                                  rows={3}
                                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/40 focus:border-[#2EBD6B] resize-none"
                                  placeholder="Describe your issue in detail..."
                                />
                              </div>
                              {ticketForms[msg.id].error && (
                                <p className="text-xs text-red-600">
                                  {ticketForms[msg.id].error}
                                </p>
                              )}
                              <button
                                onClick={() => submitTicket(msg.id)}
                                disabled={
                                  ticketForms[msg.id].submitting ||
                                  !ticketForms[msg.id].subject.trim() ||
                                  !ticketForms[msg.id].message.trim()
                                }
                                className="w-full text-xs bg-[#2EBD6B] hover:bg-[#1a9952] text-white py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                {ticketForms[msg.id].submitting ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Submitting...
                                  </>
                                ) : (
                                  "Submit Ticket"
                                )}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything..."
              disabled={loading}
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/40 focus:border-[#2EBD6B] bg-gray-50 disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2EBD6B] hover:bg-[#1a9952] disabled:opacity-40 transition-colors"
              aria-label="Send message"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
