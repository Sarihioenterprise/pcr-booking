"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  CalendarDays,
  DollarSign,
  Wrench,
  FileText,
  HeadphonesIcon,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Notification, NotificationType } from "@/lib/types";

const iconMap: Record<NotificationType, typeof Bell> = {
  new_booking: CalendarDays,
  payment_received: DollarSign,
  maintenance_due: Wrench,
  agreement_signed: FileText,
  ticket_opened: HeadphonesIcon,
  ticket_reply: HeadphonesIcon,
  lease_expiring: AlertTriangle,
  booking_status_change: CalendarDays,
  damage_report: AlertTriangle,
};

const colorMap: Record<NotificationType, string> = {
  new_booking: "text-blue-500 bg-blue-50",
  payment_received: "text-emerald-500 bg-emerald-50",
  maintenance_due: "text-amber-500 bg-amber-50",
  agreement_signed: "text-emerald-500 bg-emerald-50",
  ticket_opened: "text-purple-500 bg-purple-50",
  ticket_reply: "text-purple-500 bg-purple-50",
  lease_expiring: "text-red-500 bg-red-50",
  booking_status_change: "text-blue-500 bg-blue-50",
  damage_report: "text-red-500 bg-red-50",
};

const linkMap: Record<NotificationType, string> = {
  new_booking: "/dashboard/bookings",
  payment_received: "/dashboard/payments",
  maintenance_due: "/dashboard/fleet",
  agreement_signed: "/dashboard/agreements",
  ticket_opened: "/dashboard/support",
  ticket_reply: "/dashboard/support",
  lease_expiring: "/dashboard/fleet",
  booking_status_change: "/dashboard/bookings",
  damage_report: "/dashboard/fleet",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    // Poll every 60 seconds as fallback
    const interval = setInterval(fetchNotifications, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchNotifications, supabase]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      });
    } catch {
      // Revert on failure
      fetchNotifications();
    }
  }

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      fetchNotifications();
    }
  }

  function handleNotificationClick(n: Notification) {
    markRead(n.id);
    setOpen(false);
    const link = n.link || linkMap[n.type] || "/dashboard";
    window.location.href = link;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-[18px] w-[18px] text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-1/2 -translate-x-1/2 mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden" style={{ top: '3.5rem' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-[#2EBD6B] hover:text-[#1a9952] transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 border-2 border-gray-200 border-t-[#2EBD6B] rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">All caught up!</p>
                  <p className="text-xs text-gray-400 mt-1">
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = iconMap[n.type] || Bell;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors",
                        !n.is_read && "bg-blue-50/30"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          colorMap[n.type] || "text-gray-500 bg-gray-50"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm truncate",
                              !n.is_read
                                ? "font-semibold text-gray-900"
                                : "font-medium text-gray-700"
                            )}
                          >
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[#2EBD6B]" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
