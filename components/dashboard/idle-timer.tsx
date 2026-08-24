"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // warn at 25 minutes (5 min before logout)

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export function IdleTimer() {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    warningTimerRef.current = null;
    logoutTimerRef.current = null;
  }, []);

  const handleLogout = useCallback(async () => {
    clearTimers();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login?reason=idle");
  }, [clearTimers, router]);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    // Warning at 25 minutes
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Logout at 30 minutes
    logoutTimerRef.current = setTimeout(() => {
      handleLogout();
    }, IDLE_TIMEOUT_MS);
  }, [clearTimers, handleLogout]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    scheduleTimers();
  }, [scheduleTimers]);

  const handleStayLoggedIn = useCallback(() => {
    setShowWarning(false);
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // Start timers on mount
    scheduleTimers();

    // Attach activity listeners
    const handler = () => resetTimer();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handler, { passive: true })
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handler)
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  if (!showWarning) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
      aria-modal="true"
      role="dialog"
      aria-labelledby="idle-dialog-title"
    >
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl p-8">
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-5 rounded-full bg-amber-50 border border-amber-200">
          <svg
            className="w-7 h-7 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h2
          id="idle-dialog-title"
          className="text-xl font-bold text-gray-900 text-center mb-2"
        >
          Are you still there?
        </h2>
        <p className="text-sm text-gray-500 text-center mb-8 leading-relaxed">
          You&apos;ve been inactive for a while. For your security, you&apos;ll
          be automatically logged out in{" "}
          <span className="font-semibold text-gray-700">5 minutes</span>.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleStayLoggedIn}
            className="flex-1 rounded-lg bg-[#2EBD6B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#27a85f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2EBD6B] focus:ring-offset-2"
          >
            Stay logged in
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
          >
            Log out now
          </button>
        </div>
      </div>
    </div>
  );
}
