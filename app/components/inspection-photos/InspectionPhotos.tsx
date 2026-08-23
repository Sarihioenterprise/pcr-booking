"use client";

/**
 * InspectionPhotos
 *
 * 4-zone vehicle photo capture component for pickup and return inspections.
 * Zones: Front, Back, Left Side, Right Side
 *
 * Props:
 *   bookingId   — UUID of the booking
 *   type        — "pickup" | "return"
 *   onComplete  — callback fired when inspection is marked complete
 *   initialPhotos — optional pre-loaded photo state (path+url per zone)
 *   alreadyComplete — if true, shows completed state immediately
 */

import { useState, useRef, useCallback } from "react";
import { Camera, CheckCircle2, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type Zone = "front" | "back" | "left" | "right";

export interface ZonePhoto {
  path: string;
  url: string;
}

export interface InspectionPhotosProps {
  bookingId: string;
  type: "pickup" | "return";
  onComplete?: () => void;
  initialPhotos?: Partial<Record<Zone, ZonePhoto>>;
  alreadyComplete?: boolean;
}

const ZONES: { key: Zone; label: string; emoji: string }[] = [
  { key: "front", label: "Front", emoji: "⬆️" },
  { key: "back", label: "Back", emoji: "⬇️" },
  { key: "left", label: "Left Side", emoji: "◀️" },
  { key: "right", label: "Right Side", emoji: "▶️" },
];

export default function InspectionPhotos({
  bookingId,
  type,
  onComplete,
  initialPhotos = {},
  alreadyComplete = false,
}: InspectionPhotosProps) {
  const [photos, setPhotos] = useState<Partial<Record<Zone, ZonePhoto>>>(initialPhotos);
  const [uploading, setUploading] = useState<Partial<Record<Zone, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<Zone, string>>>({});
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(alreadyComplete);
  const [completeError, setCompleteError] = useState("");
  const fileInputRefs = useRef<Partial<Record<Zone, HTMLInputElement | null>>>({});

  const allCaptured = ZONES.every((z) => photos[z.key]?.url);

  const handleZoneClick = useCallback((zone: Zone) => {
    if (completed) return;
    fileInputRefs.current[zone]?.click();
  }, [completed]);

  const handleFileChange = useCallback(
    async (zone: Zone, file: File | null) => {
      if (!file) return;

      setErrors((prev) => ({ ...prev, [zone]: "" }));
      setUploading((prev) => ({ ...prev, [zone]: true }));

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("zone", zone);
        formData.append("type", type);

        const res = await fetch(`/api/bookings/${bookingId}/zone-photos`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        setPhotos((prev) => ({
          ...prev,
          [zone]: { path: data.path, url: data.signedUrl || "" },
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setErrors((prev) => ({ ...prev, [zone]: msg }));
      } finally {
        setUploading((prev) => ({ ...prev, [zone]: false }));
      }
    },
    [bookingId, type]
  );

  const handleComplete = useCallback(async () => {
    if (!allCaptured || completing || completed) return;

    setCompleting(true);
    setCompleteError("");

    try {
      const res = await fetch(`/api/bookings/${bookingId}/zone-photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark inspection complete");

      setCompleted(true);
      onComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to complete inspection";
      setCompleteError(msg);
    } finally {
      setCompleting(false);
    }
  }, [allCaptured, bookingId, type, completing, completed, onComplete]);

  const retakeZone = useCallback((zone: Zone) => {
    if (completed) return;
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[zone];
      return next;
    });
    setErrors((prev) => ({ ...prev, [zone]: "" }));
    // Reset the file input so the same file can be re-selected
    if (fileInputRefs.current[zone]) {
      fileInputRefs.current[zone]!.value = "";
    }
  }, [completed]);

  if (completed) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-emerald-800">
          {type === "pickup" ? "Pickup" : "Return"} Inspection Complete ✓
        </h3>
        <p className="text-sm text-emerald-700">All 4 vehicle zones have been photographed and recorded.</p>
        {/* Show thumbnails */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {ZONES.map((z) => {
            const photo = photos[z.key];
            return (
              <div key={z.key} className="space-y-1">
                <p className="text-xs font-medium text-emerald-700">{z.emoji} {z.label}</p>
                {photo?.url ? (
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={z.label}
                      className="w-full aspect-square object-cover rounded-lg border-2 border-emerald-200 hover:opacity-80 transition-opacity"
                    />
                  </a>
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Photograph all 4 sides of the vehicle
        </p>
        <Badge
          className={
            allCaptured
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }
        >
          {Object.values(photos).filter(Boolean).length} / 4 captured
        </Badge>
      </div>

      {/* Zone grid */}
      <div className="grid grid-cols-2 gap-4">
        {ZONES.map((zone) => {
          const photo = photos[zone.key];
          const isUploading = uploading[zone.key];
          const error = errors[zone.key];
          const hasCaptured = !!photo?.url;

          return (
            <div key={zone.key} className="space-y-2">
              {/* Hidden file input */}
              <input
                ref={(el) => { fileInputRefs.current[zone.key] = el; }}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                className="hidden"
                onChange={(e) => handleFileChange(zone.key, e.target.files?.[0] || null)}
              />

              {/* Zone tile */}
              <button
                type="button"
                onClick={() => handleZoneClick(zone.key)}
                disabled={isUploading || hasCaptured}
                className={`
                  w-full aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-2
                  transition-all duration-200 relative overflow-hidden
                  ${hasCaptured
                    ? "border-emerald-300 bg-emerald-50 cursor-default"
                    : isUploading
                      ? "border-blue-200 bg-blue-50 cursor-wait"
                      : "border-dashed border-slate-300 bg-slate-50 hover:border-[#2EBD6B] hover:bg-[#2EBD6B]/5 cursor-pointer active:scale-95"
                  }
                `}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    <span className="text-xs text-blue-600 font-medium">Uploading…</span>
                  </>
                ) : hasCaptured && photo?.url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={zone.label}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Overlay checkmark */}
                    <div className="absolute inset-0 bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-white drop-shadow" />
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">Tap to capture</span>
                  </>
                )}
              </button>

              {/* Zone label + retake */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  {zone.emoji} {zone.label}
                </p>
                {hasCaptured && (
                  <button
                    type="button"
                    onClick={() => retakeZone(zone.key)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retake
                  </button>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Complete inspection button */}
      <div className="pt-2 space-y-2">
        {completeError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {completeError}
          </div>
        )}
        <Button
          onClick={handleComplete}
          disabled={!allCaptured || completing}
          className={`w-full h-12 text-base font-semibold transition-all ${
            allCaptured
              ? "bg-[#2EBD6B] hover:bg-[#27a85e] text-white shadow-md hover:shadow-lg"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {completing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Completing Inspection…
            </>
          ) : allCaptured ? (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Complete {type === "pickup" ? "Pickup" : "Return"} Inspection
            </>
          ) : (
            <>
              <Camera className="h-5 w-5 mr-2" />
              Capture all 4 zones to continue
            </>
          )}
        </Button>
        {!allCaptured && (
          <p className="text-center text-xs text-slate-400">
            {4 - Object.values(photos).filter(Boolean).length} more photo
            {4 - Object.values(photos).filter(Boolean).length !== 1 ? "s" : ""} needed
          </p>
        )}
      </div>
    </div>
  );
}
