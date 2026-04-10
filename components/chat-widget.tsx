"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const AI_RESPONSES: Record<string, string> = {
  pricing: `PCR Booking offers 4 simple pricing tiers:
• **Free** — Perfect for starting out. Limited bookings.
• **Growth** — $99/month for growing operators. Unlimited bookings.
• **Pro** — $299/month with advanced features and priority support.
• **Scale** — Custom pricing for large fleets (50+ vehicles).

All plans include a 14-day free trial. No credit card required to start.`,

  features: `Here are PCR Booking's key features:
• **Booking Widget** — Embed a booking form on your website
• **Fleet Management** — Track vehicles, set rates, manage availability
• **AI Qualification Bot** — Auto-screen leads for license & age
• **Mobile Dashboard** — Manage everything on your phone
• **Payment Processing** — Built-in Stripe integration
• **Support Tickets** — Unified support system
• **Analytics** — Real-time insights into your business`,

  "getting started": `Getting started is easy:
1. **Sign up** at /auth/signup (no credit card required)
2. **Add your fleet** — List your vehicles with rates
3. **Embed the widget** — Copy one line of code to your website
4. **Get bookings** — Leads come in, you manage them from the dashboard
5. **Get paid** — Payments flow directly to your account

Start your free trial today! →`,

  turo: `Unlike Turo, you keep 100% of your revenue with PCR Booking. Turo takes 25-35% of every booking and controls your pricing. With PCR Booking, you run bookings directly on your own terms.`,

  competitor: `PCR Booking is built specifically for private rental car operators who want to keep 100% of their revenue. We're not a marketplace — we're your booking system. No commission, no middleman, just you and your customers.`,

  booking: `To add a booking, go to:
**Dashboard → Bookings → New Booking**

You can manually create bookings or customers can use your embedded booking widget to request a booking.`,

  fleet: `To add vehicles to your fleet:
**Dashboard → Fleet → Add Vehicle**

Then set your daily rates, upload photos, and toggle availability.`,

  widget: `To get your booking widget code:
**Dashboard → Settings → Widget**

Copy the embed code and paste it on your website. Your booking form will appear instantly.`,

  password: `To reset your password:
1. Go to pcrbooking.com/auth/login
2. Click **Forgot Password**
3. Enter your email
4. Follow the reset link

If you still have trouble, contact our team.`,

  payment: `For billing questions and payment issues:
📧 **Email:** support@pcrbooking.com
💳 **Stripe Invoice:** Check your Stripe dashboard for invoices
⚙️ **Manage Subscription:** Dashboard → Settings → Billing

We're here to help!`,

  cancel: `To cancel your subscription:
1. Go to **Dashboard → Settings → Billing**
2. Click **Cancel Subscription**
3. Your access ends at the end of your current billing period

No penalty — cancel anytime.`,

  help: `Hi! I can help with:
• Pricing and plans
• Features and how they work
• Getting started
• Adding bookings or vehicles
• Widget setup
• Billing and payments
• Account issues

What would you like to know more about?`,
};

function getBotResponse(input: string): string {
  const lower = input.toLowerCase();

  // Check for keyword matches
  if (lower.includes("price") || lower.includes("cost") || lower.includes("plan")) {
    return AI_RESPONSES.pricing;
  }
  if (lower.includes("feature") || lower.includes("can it") || lower.includes("does it")) {
    return AI_RESPONSES.features;
  }
  if (lower.includes("start") || lower.includes("begin") || lower.includes("getting started")) {
    return AI_RESPONSES["getting started"];
  }
  if (lower.includes("turo")) {
    return AI_RESPONSES.turo;
  }
  if (lower.includes("compet") || lower.includes("vs ") || lower.includes("vs.")) {
    return AI_RESPONSES.competitor;
  }
  if (lower.includes("booking") || lower.includes("add booking")) {
    return AI_RESPONSES.booking;
  }
  if (lower.includes("fleet") || lower.includes("vehicle") || lower.includes("add car") || lower.includes("car")) {
    return AI_RESPONSES.fleet;
  }
  if (lower.includes("widget") || lower.includes("embed")) {
    return AI_RESPONSES.widget;
  }
  if (lower.includes("password") || lower.includes("login") || lower.includes("access")) {
    return AI_RESPONSES.password;
  }
  if (lower.includes("payment") || lower.includes("charge") || lower.includes("billing")) {
    return AI_RESPONSES.payment;
  }
  if (lower.includes("cancel")) {
    return AI_RESPONSES.cancel;
  }
  if (lower.includes("help") || lower.includes("question") || lower.includes("support")) {
    return AI_RESPONSES.help;
  }

  // Default response
  return `Great question! 🤔 Our team will reach out shortly to help. Want to start your free trial in the meantime? [Start Free Trial →](https://pcrbooking.com/auth/signup)`;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hi! I am the PCR Booking assistant. I can answer questions about our platform, pricing, and features. What would you like to know?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Simulate bot thinking
    setIsLoading(true);
    setTimeout(() => {
      const botResponse = getBotResponse(inputValue);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500); // 1.5s delay
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Panel */}
      {isOpen && (
        <div className="mb-4 w-96 rounded-lg bg-white shadow-lg flex flex-col h-[600px] overflow-hidden">
          {/* Header */}
          <div className="bg-[#2EBD6B] text-white p-4 flex items-center justify-between">
            <h2 className="font-semibold">Chat with our team</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-[#1a9952] rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === "user"
                      ? "bg-[#2EBD6B] text-white"
                      : "bg-white text-gray-900 border border-gray-200"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.text}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === "user"
                        ? "text-green-100"
                        : "text-gray-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 border border-gray-200 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-gray-200 bg-white p-4 flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2EBD6B] focus:ring-2 focus:ring-[#2EBD6B]/20"
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              style={{ backgroundColor: "#2EBD6B" }}
              className="text-white hover:bg-[#1a9952]"
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-[#2EBD6B] text-white shadow-lg hover:bg-[#1a9952] transition-all transform hover:scale-110 flex items-center justify-center"
        aria-label="Open chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
