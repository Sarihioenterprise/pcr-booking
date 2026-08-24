"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck,
  ArrowDownToLine,
  Clock,
  MapPin,
  User,
  Phone,
  CheckCircle2,
  Loader2,
  Trash2,
  Edit2,
} from "lucide-react";

export interface Delivery {
  id: string;
  type: "delivery" | "pickup";
  scheduled_at: string;
  address: string;
  renter_name: string | null;
  vehicle_label: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  notes: string | null;
  booking_id: string | null;
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

interface DeliveryCardProps {
  delivery: Delivery;
  onStatusChange?: (id: string, newStatus: string) => void;
  onDelete?: (id: string) => void;
}

export function DeliveryCard({ delivery, onStatusChange, onDelete }: DeliveryCardProps) {
  const [loading, setLoading] = useState(false);

  const scheduledTime = new Date(delivery.scheduled_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isDelivery = delivery.type === "delivery";
  const Icon = isDelivery ? Truck : ArrowDownToLine;
  const typeColor = isDelivery
    ? "bg-blue-500/10 text-blue-600"
    : "bg-purple-500/10 text-purple-600";

  async function handleComplete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/deliveries/${delivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        onStatusChange?.(delivery.id, "completed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleInProgress() {
    setLoading(true);
    try {
      const res = await fetch(`/api/deliveries/${delivery.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      if (res.ok) {
        onStatusChange?.(delivery.id, "in_progress");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this delivery task?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/deliveries/${delivery.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete?.(delivery.id);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-opacity ${
        delivery.status === "completed" ? "opacity-70" : ""
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${typeColor}`}>
            <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900">
                {isDelivery ? "Delivery" : "Pickup"}
              </span>
              <Badge variant="outline" className={statusStyles[delivery.status]}>
                {statusLabels[delivery.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {scheduledTime}
            </div>
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-gray-300 hover:text-red-500 transition-colors p-1"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-sm">
        {delivery.renter_name && (
          <div className="flex items-center gap-2 text-gray-700">
            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span className="font-medium">{delivery.renter_name}</span>
            {delivery.vehicle_label && (
              <span className="text-gray-400">· {delivery.vehicle_label}</span>
            )}
          </div>
        )}
        <div className="flex items-start gap-2 text-gray-600">
          <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
          <span>{delivery.address}</span>
        </div>
        {delivery.driver_name && (
          <div className="flex items-center gap-2 text-gray-600">
            <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span>Driver: <span className="font-medium">{delivery.driver_name}</span></span>
            {delivery.driver_phone && (
              <>
                <Phone className="h-3.5 w-3.5 text-gray-400 ml-1" />
                <a href={`tel:${delivery.driver_phone}`} className="text-[#2EBD6B] hover:underline">
                  {delivery.driver_phone}
                </a>
              </>
            )}
          </div>
        )}
        {delivery.notes && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 mt-2">
            {delivery.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      {delivery.status !== "completed" && delivery.status !== "cancelled" && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          {delivery.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleInProgress}
              disabled={loading}
              className="text-xs h-7"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Edit2 className="h-3 w-3" />}
              <span className="ml-1">Start</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleComplete}
            disabled={loading}
            className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white text-xs h-7"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="h-3 w-3 mr-1" />
            )}
            Mark Complete
          </Button>
          {delivery.booking_id && (
            <a
              href={`/dashboard/bookings/${delivery.booking_id}`}
              className="text-xs text-[#2EBD6B] hover:underline ml-auto"
            >
              View Booking →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
