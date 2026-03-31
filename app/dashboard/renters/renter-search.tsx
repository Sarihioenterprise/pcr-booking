"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function RenterSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/dashboard/renters?q=${encodeURIComponent(value.trim())}`);
    } else {
      router.push("/dashboard/renters");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search by name, email, or phone..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9"
      />
    </form>
  );
}
