"use client";

import { useState, useRef } from "react";
import { useWizard } from "../WizardContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, ChevronLeft, ChevronRight, X, CheckCircle2, Upload } from "lucide-react";

interface Step7Props {
  onNext: () => void;
  onBack: () => void;
  operatorId: string;
}

export function Step7PickupPhotos({ onNext, onBack, operatorId }: Step7Props) {
  const { state, dispatch } = useWizard();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const zones = state.inspection_zones;

  async function uploadZone(zone: string, file: File) {
    // Require booking_id for the zone-photos endpoint
    if (!state.booking_id) {
      setError("Booking must be created before uploading photos.");
      return;
    }

    setUploading((prev) => ({ ...prev, [zone]: true }));
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("zone", zone);
      fd.append("type", "pickup");

      const res = await fetch(`/api/bookings/${state.booking_id}/zone-photos`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      // Generate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        dispatch({
          type: "UPDATE_ZONE",
          payload: {
            zone: zone as "front" | "back" | "left" | "right",
            updates: {
              file,
              preview: e.target?.result as string,
              path: data.path,
            },
          },
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading((prev) => ({ ...prev, [zone]: false }));
    }
  }

  function removeZone(zone: string) {
    dispatch({
      type: "UPDATE_ZONE",
      payload: {
        zone: zone as "front" | "back" | "left" | "right",
        updates: { file: null, preview: null, path: null },
      },
    });
  }

  async function handleNext() {
    setSaving(true);
    setError("");

    try {
      // Mark pickup inspection complete on the booking
      if (state.booking_id) {
        await fetch(`/api/bookings/${state.booking_id}/zone-photos`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "pickup" }),
        }).catch(() => {}); // non-fatal
      }

      dispatch({
        type: "SET_INSPECTION",
        payload: {
          pickup_inspection_id: state.booking_id, // use booking_id as inspection ref
          inspection_zones: zones,
        },
      });

      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const uploadedCount = zones.filter((z) => z.path).length;

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
            <Camera className="h-3.5 w-3.5 text-[#2EBD6B]" />
          </div>
          Pickup Photos
          {uploadedCount > 0 && (
            <span className="ml-auto text-xs font-normal text-[#2EBD6B]">
              {uploadedCount}/4 uploaded
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-gray-500">
          Capture photos of the vehicle from all 4 zones to document its condition at pickup.
          {!state.booking_id && (
            <span className="ml-1 text-amber-600 font-medium">
              (Photos will be skipped — booking not yet created)
            </span>
          )}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {zones.map((zone) => (
            <ZoneUploader
              key={zone.zone}
              zone={zone}
              uploading={uploading[zone.zone] ?? false}
              onFile={(file) => uploadZone(zone.zone, file)}
              onRemove={() => removeZone(zone.zone)}
              onClick={() => fileRefs.current[zone.zone]?.click()}
            >
              <input
                ref={(el) => { fileRefs.current[zone.zone] = el; }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadZone(zone.zone, file);
                  e.target.value = "";
                }}
              />
            </ZoneUploader>
          ))}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 border-gray-200">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 bg-[#2EBD6B] text-white hover:bg-[#27a85e]"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </span>
            ) : (
              <>
                Continue — Summary <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Zone uploader card ────────────────────────────────────────────────────

function ZoneUploader({
  zone,
  uploading,
  onFile: _onFile,
  onRemove,
  onClick,
  children,
}: {
  zone: { zone: string; label: string; preview: string | null; path: string | null };
  uploading: boolean;
  onFile: (f: File) => void;
  onRemove: () => void;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-xl border-2 border-dashed border-gray-200 bg-[#F8F9FC] overflow-hidden transition-colors hover:border-[#2EBD6B]/40">
      {/* Label */}
      <div className="absolute top-2 left-2 z-10 bg-black/50 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
        {zone.label}
      </div>

      {zone.preview ? (
        <>
          {/* Preview */}
          <img
            src={zone.preview}
            alt={zone.label}
            className="h-40 w-full object-cover"
          />
          {/* Remove button */}
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {/* Checkmark */}
          {zone.path && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              Uploaded
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={uploading}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 text-gray-400 hover:text-[#2EBD6B] transition-colors"
        >
          {uploading ? (
            <>
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#2EBD6B] border-t-transparent" />
              <span className="text-xs">Uploading…</span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8" />
              <span className="text-xs">Tap to capture / upload</span>
            </>
          )}
        </button>
      )}
      {children}
    </div>
  );
}
