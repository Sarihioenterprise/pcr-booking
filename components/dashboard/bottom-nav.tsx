"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarDays,
  Car,
  DollarSign,
  BarChart3,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/dashboard/fleet", label: "Fleet", icon: Car },
  { href: "/dashboard/payments", label: "Payments", icon: DollarSign },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c1c] border-t border-white/10">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-2 py-1.5 text-[10px] font-medium transition-colors relative",
                isActive ? "text-[#2EBD6B]" : "text-white/50"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-[#2EBD6B]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
