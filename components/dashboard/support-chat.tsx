"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
}

const FAQ: Array<{ keywords: string[]; answer: string }> = [
  {
    keywords: ["booking", "add booking", "new booking", "create booking"],
    answer: "To add a booking: go to Dashboard → Bookings → New Booking. You can also share your booking link with renters so they can book directly.",
  },
  {
    keywords: ["fleet", "add car", "add vehicle", "new vehicle"],
    answer: "To add a vehicle: go to Dashboard → Fleet → Add Vehicle. Set your rate, availability, and details there.",
  },
  {
    keywords: ["payment", "collect payment", "charge", "stripe"],
    answer: "Payments are collected via Stripe. Go to Dashboard → Payments to see all transactions. Make sure your Stripe account is connected in Settings → Payment.",
  },
  {
    keywords: ["agreement", "contract", "sign", "digital signature"],
    answer: "Set up your rental agreement template at Dashboard → Agreements → Templates. Once saved, it automatically sends to renters when a booking is confirmed — they sign digitally.",
  },
  {
    keywords: ["widget", "embed", "website", "code"],
    answer: "Get your embed code at Dashboard → Settings → Widget. Paste it on any website page and your booking form will appear automatically.",
  },
  {
    keywords: ["booking link", "slug", "share link", "public link"],
    answer: "Set your booking page slug at Dashboard → Settings → Booking Page. Your link will be pcrbooking.com/book/[your-slug]. Share it directly with renters.",
  },
  {
    keywords: ["plan", "upgrade", "pricing", "cost", "subscription"],
    answer: "PCR Booking plans: Free (up to 3 cars), Growth $79/mo, Pro $149/mo, Scale $249/mo. Upgrade anytime at Dashboard → Settings → Plan.",
  },
  {
    keywords: ["team", "member", "staff", "invite"],
    answer: "Add team members at Dashboard → Settings → Team. You can assign Owner, Manager, or Staff roles.",
  },
  {
    keywords: ["collection", "overdue", "late", "dunning"],
    answer: "The Collections page (Dashboard → Collections) shows all overdue payments and lets you send SMS reminders or mark payments as paid. Automated reminders run on days 0, 3, 5, and 7.",
  },
  {
    keywords: ["renter", "blacklist", "block"],
    answer: "To blacklist a renter: go to Dashboard → Renters → click the renter → Blacklist. Blacklisted renters cannot submit new bookings through your booking page.",
  },
  {
    keywords: ["inspection", "vehicle inspection", "condition"],
    answer: "Log vehicle inspections at Dashboard → Inspections → New Inspection. Attach photos and notes for pre/post-rental records.",
  },
  {
    keywords: ["support", "ticket", "help", "issue", "problem"],
    answer: "You can submit a support ticket using the '+ New Ticket' button at the top of this page. Describe your issue and we'll get back to you ASAP.",
  },
  {
    keywords: ["branding", "logo", "color", "white label"],
    answer: "Custom branding is available on the Scale plan. Go to Dashboard → Settings → Branding to upload your logo, set brand colors, and customize your renter booking page.",
  },
  {
    keywords: ["affiliate", "referral", "commission"],
    answer: "PCR Booking's affiliate program pays 30% recurring commission for 12 months. Sign up at pcrbooking.com/affiliates.",
  },
];

function getBotReply(input: string): string {
  const lower = input.toLowerCase();
  for (const entry of FAQ) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.answer;
    }
  }
  return "I'm not sure about that one. Try submitting a support ticket using the '+ New Ticket' button and our team will help you directly.";
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      text: "Hi! I'm the PCR Booking support bot. Ask me anything about the app — bookings, payments, fleet, agreements, or anything else. For issues that need a human, use the '+ New Ticket' button above.",
      sender: "bot",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: Date.now().toString(), text, sender: "user" };
    const botReply: Message = {
      id: (Date.now() + 1).toString(),
      text: getBotReply(text),
      sender: "bot",
    };
    setMessages((prev) => [...prev, userMsg, botReply]);
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#2EBD6B] hover:bg-[#1a9952] text-white px-4 py-3 rounded-full shadow-lg transition-all"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && <span className="text-sm font-semibold">Talk to Support</span>}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl bg-white border border-gray-200 flex flex-col overflow-hidden" style={{ maxHeight: "480px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#2EBD6B]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">PCR Support</p>
              <p className="text-xs text-white/80">Ask me anything</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto p-1 rounded hover:bg-white/20 transition-colors">
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#2EBD6B] text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-white">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask a question..."
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/40 focus:border-[#2EBD6B] bg-gray-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2EBD6B] hover:bg-[#1a9952] disabled:opacity-40 transition-colors"
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
