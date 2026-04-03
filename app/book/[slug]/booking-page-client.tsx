"use client";

import { useState } from "react";
import { Car, CheckCircle2, Calendar, Phone, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  category: string;
  photo_url: string | null;
  photos?: { url: string; is_primary: boolean }[];
}

interface Operator {
  id: string;
  business_name: string;
  logo_url: string | null;
  brand_color: string;
}

interface Props {
  operator: Operator;
  vehicles: Vehicle[];
  slug: string;
}

interface BookingForm {
  name: string;
  phone: string;
  email: string;
  start_date: string;
  end_date: string;
}

const emptyForm: BookingForm = {
  name: "",
  phone: "",
  email: "",
  start_date: "",
  end_date: "",
};

export function BookingPageClient({ operator, vehicles, slug }: Props) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const accent = operator.brand_color || "#2EBD6B";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/book/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_id: operator.id,
          vehicle_id: selectedVehicle.id,
          vehicle_label: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
          ...form,
          slug,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit request. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function getVehiclePhoto(v: Vehicle) {
    const primary = v.photos?.find((p) => p.is_primary);
    return primary?.url || v.photos?.[0]?.url || v.photo_url;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-3">
          {operator.logo_url ? (
            <img src={operator.logo_url} alt={operator.business_name} className="h-10 w-auto object-contain" />
          ) : (
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: accent }}
            >
              {operator.business_name[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{operator.business_name}</h1>
            <p className="text-sm text-gray-500">Available Vehicles</p>
          </div>
        </div>
      </header>

      {/* Vehicles */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {vehicles.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Car className="mx-auto h-12 w-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No vehicles available right now.</p>
            <p className="text-sm mt-1">Please check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => {
              const photo = getVehiclePhoto(v);
              return (
                <div key={v.id} className="bg-white rounded-xl shadow-sm border-0 overflow-hidden hover:shadow-md transition-shadow">
                  {photo ? (
                    <div className="aspect-video w-full overflow-hidden bg-gray-100">
                      <img src={photo} alt={`${v.make} ${v.model}`} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video w-full flex items-center justify-center bg-gray-50">
                      <Car className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {v.year} {v.make} {v.model}
                      </h3>
                      {v.category && (
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {v.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                      <span>
                        <span className="font-bold text-gray-900">${Number(v.daily_rate).toFixed(0)}</span>/day
                      </span>
                      {v.weekly_rate && (
                        <span>
                          <span className="font-bold text-gray-900">${Number(v.weekly_rate).toFixed(0)}</span>/week
                        </span>
                      )}
                    </div>
                    <Button
                      className="w-full text-white font-semibold"
                      style={{ backgroundColor: accent }}
                      onClick={() => {
                        setSelectedVehicle(v);
                        setForm(emptyForm);
                        setSubmitted(false);
                        setError("");
                      }}
                    >
                      Request to Book
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Booking Request Dialog */}
      <Dialog open={!!selectedVehicle && !submitted} onOpenChange={(o) => { if (!o) setSelectedVehicle(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request to Book</DialogTitle>
            <DialogDescription>
              {selectedVehicle && `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} — $${Number(selectedVehicle.daily_rate).toFixed(0)}/day`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="req-name">
                <User className="h-3.5 w-3.5 inline mr-1" />
                Full Name
              </Label>
              <Input
                id="req-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="req-phone">
                <Phone className="h-3.5 w-3.5 inline mr-1" />
                Phone Number
              </Label>
              <Input
                id="req-phone"
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="req-email">
                <Mail className="h-3.5 w-3.5 inline mr-1" />
                Email Address
              </Label>
              <Input
                id="req-email"
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="req-start">
                  <Calendar className="h-3.5 w-3.5 inline mr-1" />
                  Start Date
                </Label>
                <Input
                  id="req-start"
                  required
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-end">End Date</Label>
                <Input
                  id="req-end"
                  required
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelectedVehicle(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="text-white"
                style={{ backgroundColor: accent }}
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={submitted} onOpenChange={(o) => { if (!o) { setSubmitted(false); setSelectedVehicle(null); } }}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
              <p className="text-gray-600">
                Your request has been submitted! <strong>{operator.business_name}</strong> will contact you shortly.
              </p>
            </div>
            <Button
              onClick={() => { setSubmitted(false); setSelectedVehicle(null); }}
              className="text-white mt-2"
              style={{ backgroundColor: accent }}
            >
              Browse More Vehicles
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
