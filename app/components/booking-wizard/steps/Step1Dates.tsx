"use client";

import { useState, useEffect } from "react";
import { useWizard } from "../WizardContext";
import { WizardLocation } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, MapPin, ChevronRight } from "lucide-react";

interface Step1Props {
  onNext: () => void;
}

export function Step1Dates({ onNext }: Step1Props) {
  const { state, dispatch } = useWizard();
  const [locations, setLocations] = useState<WizardLocation[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(Array.isArray(d) ? d : d.locations ?? []))
      .catch(() => setLocations([]));
  }, []);

  const today = new Date().toISOString().split("T")[0];

  const duration =
    state.start_date && state.end_date
      ? Math.max(
          0,
          Math.ceil(
            (new Date(state.end_date).getTime() - new Date(state.start_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  function handleNext() {
    if (!state.start_date || !state.end_date) {
      setError("Please select pickup and return dates.");
      return;
    }
    if (duration <= 0) {
      setError("Return date must be after pickup date.");
      return;
    }
    setError("");

    const locationObj = locations.find((l) => l.id === state.location_id);
    dispatch({
      type: "SET_DATES",
      payload: {
        start_date: state.start_date,
        start_time: state.start_time,
        end_date: state.end_date,
        return_time: state.return_time,
        location_id: state.location_id,
        location_name: locationObj?.name ?? state.location_name,
        duration_days: duration,
      },
    });
    onNext();
  }

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
            <CalendarDays className="h-3.5 w-3.5 text-[#2EBD6B]" />
          </div>
          Rental Dates &amp; Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Location */}
        {locations.length > 0 && (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              Pickup Location
            </Label>
            <Select
              value={state.location_id}
              onValueChange={(val) => {
                const loc = locations.find((l) => l.id === val);
                dispatch({
                  type: "SET_DATES",
                  payload: {
                    ...state,
                    location_id: val ?? "",
                    location_name: loc?.name ?? "",
                    duration_days: duration,
                  },
                });
              }}
            >
              <SelectTrigger className="border-gray-200 bg-[#F8F9FC] focus:ring-[#2EBD6B]">
                <SelectValue placeholder="Select a pickup location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.address ? ` — ${loc.address}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Pickup */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              Pickup Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              min={today}
              value={state.start_date}
              onChange={(e) =>
                dispatch({
                  type: "SET_DATES",
                  payload: { ...state, start_date: e.target.value, duration_days: duration },
                })
              }
              className="border-gray-200 bg-white focus-visible:ring-[#2EBD6B]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Pickup Time</Label>
            <Input
              type="time"
              value={state.start_time}
              onChange={(e) =>
                dispatch({
                  type: "SET_DATES",
                  payload: { ...state, start_time: e.target.value, duration_days: duration },
                })
              }
              className="border-gray-200 bg-white focus-visible:ring-[#2EBD6B]"
            />
          </div>
        </div>

        {/* Return */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              Return Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              min={state.start_date || today}
              value={state.end_date}
              onChange={(e) =>
                dispatch({
                  type: "SET_DATES",
                  payload: { ...state, end_date: e.target.value, duration_days: duration },
                })
              }
              className="border-gray-200 bg-white focus-visible:ring-[#2EBD6B]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Return Time</Label>
            <Input
              type="time"
              value={state.return_time}
              onChange={(e) =>
                dispatch({
                  type: "SET_DATES",
                  payload: { ...state, return_time: e.target.value, duration_days: duration },
                })
              }
              className="border-gray-200 bg-white focus-visible:ring-[#2EBD6B]"
            />
          </div>
        </div>

        {/* Duration indicator */}
        {duration > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-[#2EBD6B]/5 px-4 py-3 border border-[#2EBD6B]/20">
            <CalendarDays className="h-4 w-4 text-[#2EBD6B] shrink-0" />
            <span className="text-sm font-semibold text-gray-800">
              {duration} {duration === 1 ? "day" : "days"}
            </span>
            <span className="text-sm text-gray-500 ml-1">
              {state.start_date} @ {state.start_time} → {state.end_date} @ {state.return_time}
            </span>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          onClick={handleNext}
          className="w-full bg-[#2EBD6B] text-white hover:bg-[#27a85e]"
        >
          Continue — Select Vehicle
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
