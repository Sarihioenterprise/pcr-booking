"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Users, Bell, Trash2, Plus, Loader2, Phone, Mail } from "lucide-react";

interface WaitlistEntry {
  id: string;
  renter_name: string;
  renter_email: string | null;
  renter_phone: string | null;
  notes: string | null;
  position: number;
  status: "waiting" | "notified" | "booked" | "removed";
  notified_at: string | null;
  created_at: string;
}

interface DriverWaitlistProps {
  vehicleId: string;
  vehicleName: string;
}

const STATUS_STYLES: Record<string, string> = {
  waiting: "bg-amber-100 text-amber-800",
  notified: "bg-blue-100 text-blue-800",
  booked: "bg-green-100 text-green-800",
  removed: "bg-slate-100 text-slate-500",
};

export function DriverWaitlist({ vehicleId, vehicleName }: DriverWaitlistProps) {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Add form state
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const baseUrl = `/api/vehicles/${vehicleId}/waitlist`;

  const fetchWaitlist = useCallback(async () => {
    const res = await fetch(baseUrl);
    const json = await res.json();
    setWaitlist((json.waitlist ?? []).filter((e: WaitlistEntry) => e.status !== "removed"));
    setLoading(false);
  }, [baseUrl]);

  useEffect(() => {
    fetchWaitlist();
  }, [fetchWaitlist]);

  async function handleAdd() {
    if (!form.name.trim()) {
      setAddError("Name is required");
      return;
    }
    setAddLoading(true);
    setAddError(null);
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        renter_name: form.name.trim(),
        renter_email: form.email.trim() || null,
        renter_phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
      }),
    });
    if (res.ok) {
      setForm({ name: "", email: "", phone: "", notes: "" });
      setAddOpen(false);
      await fetchWaitlist();
    } else {
      const j = await res.json();
      setAddError(j.error || "Failed to add");
    }
    setAddLoading(false);
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    await fetch(`${baseUrl}?waitlistId=${id}`, { method: "DELETE" });
    setRemovingId(null);
    await fetchWaitlist();
  }

  async function handleNotify() {
    setNotifyLoading(true);
    setNotifyMsg(null);
    const res = await fetch(`${baseUrl}/notify`, { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setNotifyMsg(`SMS sent to ${json.notified}`);
      await fetchWaitlist();
    } else {
      setNotifyMsg(json.error || "Failed to notify");
    }
    setNotifyLoading(false);
    setTimeout(() => setNotifyMsg(null), 5000);
  }

  const waiting = waitlist.filter((e) => e.status === "waiting");

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          <span className="font-medium text-slate-800">Driver Waitlist</span>
          {waiting.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5">
              {waiting.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {waiting.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1"
              onClick={handleNotify}
              disabled={notifyLoading}
            >
              {notifyLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Bell className="h-3 w-3" />
              )}
              Notify Next
            </Button>
          )}
          <Button
            size="sm"
            className="text-xs gap-1 bg-[#2EBD6B] hover:bg-[#28a85f] text-white"
            onClick={() => { setAddOpen(true); setAddError(null); }}
          >
            <Plus className="h-3 w-3" />
            Add to Waitlist
          </Button>
        </div>
      </div>

      {/* Notify feedback */}
      {notifyMsg && (
        <div className="mx-5 mt-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-2 text-sm text-blue-700">
          {notifyMsg}
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-slate-50">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : waitlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
            <Users className="h-8 w-8" />
            <p className="text-sm">No one on the waitlist for this vehicle</p>
          </div>
        ) : (
          waitlist.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 mt-0.5">
                {entry.position}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800 text-sm">{entry.renter_name}</span>
                  <Badge className={`text-xs px-1.5 py-0 ${STATUS_STYLES[entry.status] ?? ""}`}>
                    {entry.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {entry.renter_phone && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Phone className="h-3 w-3" />
                      {entry.renter_phone}
                    </span>
                  )}
                  {entry.renter_email && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Mail className="h-3 w-3" />
                      {entry.renter_email}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </span>
                </div>
                {entry.notes && (
                  <p className="text-xs text-slate-500 mt-0.5 italic">{entry.notes}</p>
                )}
                {entry.notified_at && (
                  <p className="text-xs text-blue-500 mt-0.5">
                    Notified {new Date(entry.notified_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRemove(entry.id)}
                disabled={removingId === entry.id}
                className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors mt-0.5"
                aria-label="Remove from waitlist"
              >
                {removingId === entry.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Waitlist</DialogTitle>
            <p className="text-sm text-slate-500">{vehicleName}</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="wl-name">Name *</Label>
              <Input
                id="wl-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Driver name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="wl-phone">Phone</Label>
              <Input
                id="wl-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="wl-email">Email</Label>
              <Input
                id="wl-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="driver@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="wl-notes">Notes</Label>
              <Textarea
                id="wl-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. needs weekly rate, budget $350/wk"
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
            {addError && (
              <p className="text-sm text-red-500">{addError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={addLoading}
              className="bg-[#2EBD6B] hover:bg-[#28a85f] text-white"
            >
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add to Waitlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
