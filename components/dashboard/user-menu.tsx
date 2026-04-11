"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, CreditCard, Users, ChevronDown, ArrowUpCircle, HeadphonesIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email || "");
        const meta = data.user.user_metadata;
        setName(meta?.full_name || meta?.name || data.user.email?.split("@")[0] || "User");
      }
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none"
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: "#2EBD6B" }}
        >
          {initials}
        </div>
        <span className="hidden sm:block max-w-[120px] truncate">{name || email}</span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            {name && <p className="font-semibold text-gray-900 text-sm">{name}</p>}
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => navigate("/dashboard/settings")}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4 text-gray-400" />
              Settings
            </button>
            <button
              onClick={() => navigate("/dashboard/settings?tab=subscription")}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <CreditCard className="h-4 w-4 text-gray-400" />
              Billing &amp; Plan
            </button>
            <button
              onClick={() => navigate("/onboarding/plan")}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ArrowUpCircle className="h-4 w-4 text-gray-400" />
              Upgrade Account
            </button>
            <button
              onClick={() => navigate("/dashboard/settings?tab=team")}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Users className="h-4 w-4 text-gray-400" />
              Team Members
            </button>
            <button
              onClick={() => navigate("/dashboard/support")}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <HeadphonesIcon className="h-4 w-4 text-gray-400" />
              Support
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
