"use client";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Star, Trash2 } from "lucide-react";
import type { Location } from "@/lib/types";

export function LocationActions({ location }: { location: Location }) {
  const router = useRouter();

  async function handleSetDefault() {
    const res = await fetch("/api/locations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: location.id, is_default: true }),
    });
    if ((await res.json()).success) {
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete location "${location.name}"?`)) return;
    const res = await fetch(`/api/locations?id=${location.id}`, {
      method: "DELETE",
    });
    if ((await res.json()).success) {
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 hover:bg-accent hover:text-accent-foreground">
        <MoreVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!location.is_default && (
          <DropdownMenuItem onClick={handleSetDefault}>
            <Star className="h-4 w-4 mr-2" />
            Set as Default
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
