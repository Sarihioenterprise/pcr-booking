"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "/tour", label: "Product Tour" },
  { href: "/features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "#affiliates", label: "Affiliates" },
];

export function HomeNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#080812]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img src="/icon.png" alt="PCR Logo" className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">PCR Booking</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/auth/login"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            Login
          </Link>
          <Link href="/auth/signup">
            <Button className="h-9 bg-[#2EBD6B] px-4 text-sm font-semibold text-white hover:bg-[#1a9952]">
              Sign Up
            </Button>
          </Link>
        </div>

        {/* Mobile: auth buttons + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/auth/login"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            Login
          </Link>
          <Link href="/auth/signup">
            <Button className="h-8 bg-[#2EBD6B] px-3 text-xs font-semibold text-white hover:bg-[#1a9952]">
              Sign Up
            </Button>
          </Link>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="ml-1 rounded-md p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#080812] px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
