"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function NewTicketButton() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: operator } = await supabase
        .from("operators")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!operator) return;

      await supabase.from("support_tickets").insert({
        operator_id: operator.id,
        subject: subject.trim(),
        message: message.trim(),
        priority,
        status: "open",
        source: "operator",
      });

      setSubject("");
      setMessage("");
      setPriority("normal");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        style={{ backgroundColor: "#2EBD6B" }}
        className="text-white hover:bg-[#1a9952] shrink-0"
      >
        + New Ticket
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Submit Support Request</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Payment not collecting"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/40 focus:border-[#2EBD6B]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/40 focus:border-[#2EBD6B] bg-white"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/40 focus:border-[#2EBD6B] resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#2EBD6B] hover:bg-[#1a9952] text-white"
                  disabled={saving}
                >
                  {saving ? "Submitting..." : "Submit Ticket"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
