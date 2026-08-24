"use client";

import { useState, useEffect, useCallback } from "react";
import { DeliveryCard, type Delivery } from "@/components/deliveries/DeliveryCard";
import { Button } from "@/components/ui/button";
import {
  Truck,
  ArrowDownToLine,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";

function formatDateLocal(d: Date) {
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function DeliveriesPage() {
  const today = formatDateLocal(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    type: "delivery",
    scheduled_at: `${today}T10:00`,
    address: "",
    renter_name: "",
    vehicle_label: "",
    driver_name: "",
    driver_phone: "",
    notes: "",
    booking_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchDeliveries = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/deliveries?date=${date}`);
      const data = await res.json();
      setDeliveries(data.deliveries || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries(selectedDate);
  }, [selectedDate, fetchDeliveries]);

  function shiftDate(days: number) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + days);
    setSelectedDate(formatDateLocal(d));
  }

  function handleStatusChange(id: string, newStatus: string) {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus as Delivery["status"] } : d))
    );
  }

  function handleDelete(id: string) {
    setDeliveries((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleAddDelivery(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.address.trim()) {
      setFormError("Address is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          booking_id: form.booking_id.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create delivery");
        return;
      }
      // Refresh the list
      await fetchDeliveries(selectedDate);
      setShowAddForm(false);
      setForm({
        type: "delivery",
        scheduled_at: `${selectedDate}T10:00`,
        address: "",
        renter_name: "",
        vehicle_label: "",
        driver_name: "",
        driver_phone: "",
        notes: "",
        booking_id: "",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const deliveryItems = deliveries.filter((d) => d.type === "delivery");
  const pickupItems = deliveries.filter((d) => d.type === "pickup");
  const pendingCount = deliveries.filter((d) => d.status === "pending" || d.status === "in_progress").length;
  const completedCount = deliveries.filter((d) => d.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deliveries & Pickups</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Schedule and track vehicle deliveries and pickups
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => shiftDate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        </button>
        <div className="flex-1 text-center">
          <span className="font-semibold text-gray-900">{formatDisplayDate(selectedDate)}</span>
          {selectedDate === today && (
            <span className="ml-2 text-xs font-medium text-[#2EBD6B] bg-[#2EBD6B]/10 px-2 py-0.5 rounded-full">
              Today
            </span>
          )}
        </div>
        <button
          onClick={() => shiftDate(1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-gray-600" />
        </button>
        <button
          onClick={() => setSelectedDate(today)}
          className="text-sm text-[#2EBD6B] hover:underline font-medium px-2"
        >
          Today
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
        />
      </div>

      {/* Summary bar */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 bg-white rounded-lg border px-4 py-2.5 shadow-sm">
          <Truck className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">{deliveryItems.length} Deliveries</span>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border px-4 py-2.5 shadow-sm">
          <ArrowDownToLine className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-medium text-gray-700">{pickupItems.length} Pickups</span>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border px-4 py-2.5 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-sm font-medium text-gray-700">{pendingCount} Pending</span>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border px-4 py-2.5 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-sm font-medium text-gray-700">{completedCount} Done</span>
        </div>
      </div>

      {/* Add form modal overlay */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 relative">
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Delivery / Pickup Task</h2>
            <form onSubmit={handleAddDelivery} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
                  >
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Pickup</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled Time *</label>
                  <input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="123 Main St, City, State"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Renter Name</label>
                  <input
                    type="text"
                    value={form.renter_name}
                    onChange={(e) => setForm({ ...form, renter_name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle</label>
                  <input
                    type="text"
                    value={form.vehicle_label}
                    onChange={(e) => setForm({ ...form, vehicle_label: e.target.value })}
                    placeholder="2023 Honda Civic"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={form.driver_name}
                    onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                    placeholder="Driver name"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Driver Phone</label>
                  <input
                    type="tel"
                    value={form.driver_phone}
                    onChange={(e) => setForm({ ...form, driver_phone: e.target.value })}
                    placeholder="(555) 555-5555"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Booking ID (optional)</label>
                <input
                  type="text"
                  value={form.booking_id}
                  onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
                  placeholder="Link to existing booking"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Special instructions, gate codes, etc."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30 resize-none"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#2EBD6B] hover:bg-[#26a85d] text-white"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#2EBD6B]" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-4">
            <Truck className="h-7 w-7 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-900">No deliveries scheduled</p>
          <p className="mt-1 text-sm text-gray-500 max-w-xs">
            No delivery or pickup tasks for this day. Click &quot;Add Task&quot; to schedule one.
          </p>
          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
            className="mt-4 border-[#2EBD6B] text-[#2EBD6B] hover:bg-[#2EBD6B]/5"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add First Task
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Deliveries */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-blue-500" />
              <h2 className="font-semibold text-gray-800">
                Deliveries ({deliveryItems.length})
              </h2>
            </div>
            {deliveryItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center border border-dashed rounded-xl">
                No deliveries scheduled
              </p>
            ) : (
              <div className="space-y-3">
                {deliveryItems.map((d) => (
                  <DeliveryCard
                    key={d.id}
                    delivery={d}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pickups */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ArrowDownToLine className="h-4 w-4 text-purple-500" />
              <h2 className="font-semibold text-gray-800">
                Pickups ({pickupItems.length})
              </h2>
            </div>
            {pickupItems.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center border border-dashed rounded-xl">
                No pickups scheduled
              </p>
            ) : (
              <div className="space-y-3">
                {pickupItems.map((d) => (
                  <DeliveryCard
                    key={d.id}
                    delivery={d}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
