"use client";

import { useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Car,
  Users,
  Calendar,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform = "rentcentric" | "hqrentals" | "";

interface FileState {
  file: File | null;
  preview: Record<string, string>[];
  headers: string[];
  error: string | null;
}

interface RowError {
  row: number;
  data: Record<string, string>;
  reason: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: RowError[];
}

interface MigrationResults {
  vehicles: ImportResult;
  customers: ImportResult;
  bookings: ImportResult;
  summary: {
    vehicles_imported: number;
    vehicles_updated: number;
    customers_imported: number;
    customers_updated: number;
    bookings_imported: number;
    bookings_skipped: number;
    total_imported: number;
    total_errors: number;
  };
}

// ---------------------------------------------------------------------------
// CSV preview parser (client-side, lightweight)
// ---------------------------------------------------------------------------

function parseCSVPreview(text: string, maxRows = 5): { headers: string[]; rows: Record<string, string>[] } {
  const stripped = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const lines = stripped.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim()); current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseRow(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i <= Math.min(maxRows, lines.length - 1); i++) {
    const vals = parseRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
    rows.push(row);
  }
  return { headers, rows };
}

// ---------------------------------------------------------------------------
// File drop zone component
// ---------------------------------------------------------------------------

interface FileZoneProps {
  label: string;
  icon: React.ReactNode;
  description: string;
  state: FileState;
  onFile: (file: File) => void;
  onClear: () => void;
}

function FileZone({ label, icon, description, state, onFile, onClear }: FileZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div className="space-y-3">
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-green-400 bg-green-50"
            : state.file
            ? "border-green-300 bg-green-50"
            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />

        {state.file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{state.file.name}</p>
                <p className="text-xs text-gray-500">
                  {state.preview.length} preview rows • {(state.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-gray-400 hover:text-red-500"
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-center text-gray-400">{icon}</div>
            <p className="text-sm font-medium text-gray-700">{label}</p>
            <p className="text-xs text-gray-400">{description}</p>
            <p className="text-xs text-gray-400">
              Drop CSV here or{" "}
              <span className="text-green-600 underline">browse</span>
            </p>
          </div>
        )}
      </div>

      {state.error && (
        <div className="flex items-center gap-2 text-red-600 text-xs">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {state.error}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview table component
// ---------------------------------------------------------------------------

function PreviewTable({ headers, rows, title }: { headers: string[]; rows: Record<string, string>[]; title: string }) {
  if (!rows.length) return null;
  // Show max 6 columns in preview to avoid overflow
  const previewHeaders = headers.slice(0, 6);
  const hasMore = headers.length > 6;

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-gray-500 mb-2">{title} — first {rows.length} rows preview</p>
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="text-xs w-full">
          <thead>
            <tr className="bg-gray-50">
              {previewHeaders.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                  {h}
                </th>
              ))}
              {hasMore && (
                <th className="px-3 py-2 text-left font-medium text-gray-400">
                  +{headers.length - 6} more cols
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                {previewHeaders.map((h) => (
                  <td key={h} className="px-3 py-1.5 text-gray-700 max-w-[120px] truncate whitespace-nowrap">
                    {row[h] ?? ""}
                  </td>
                ))}
                {hasMore && <td className="px-3 py-1.5 text-gray-300">…</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result badge
// ---------------------------------------------------------------------------

function ResultCard({ title, icon, imported, updated, errors }: {
  title: string;
  icon: React.ReactNode;
  imported: number;
  updated: number;
  errors: RowError[];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-green-500">{icon}</div>
        <span className="font-medium text-sm text-gray-800">{title}</span>
        {errors.length > 0 ? (
          <Badge variant="destructive" className="ml-auto text-xs">{errors.length} errors</Badge>
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
        )}
      </div>
      <div className="flex gap-4 text-sm">
        <div>
          <p className="text-2xl font-bold text-gray-900">{imported}</p>
          <p className="text-xs text-gray-400">New records</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{updated}</p>
          <p className="text-xs text-gray-400">Updated</p>
        </div>
      </div>

      {errors.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-red-600 underline"
          >
            {expanded ? "Hide" : "Show"} {errors.length} error{errors.length !== 1 ? "s" : ""}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {errors.map((e, i) => (
                <div key={i} className="text-xs bg-red-50 rounded p-2 text-red-700">
                  Row {e.row}: {e.reason}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const EMPTY_FILE_STATE: FileState = { file: null, preview: [], headers: [], error: null };

export default function MigrationPage() {
  const [platform, setPlatform] = useState<Platform>("");
  const [vehicleFile, setVehicleFile] = useState<FileState>(EMPTY_FILE_STATE);
  const [customerFile, setCustomerFile] = useState<FileState>(EMPTY_FILE_STATE);
  const [bookingFile, setBookingFile] = useState<FileState>(EMPTY_FILE_STATE);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<MigrationResults | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFile = useCallback(
    (setter: React.Dispatch<React.SetStateAction<FileState>>) =>
      (file: File) => {
        if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
          setter({ file: null, preview: [], headers: [], error: "Please upload a CSV file (.csv). If you have an Excel file, open it and Save As → CSV first." });
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const { headers, rows } = parseCSVPreview(text);
          setter({ file, headers, preview: rows, error: null });
        };
        reader.readAsText(file);
      },
    []
  );

  const hasAnyFile = vehicleFile.file || customerFile.file || bookingFile.file;

  const handleImport = async () => {
    if (!platform) {
      setImportError("Please select your current platform (RentCentric or HQ Rentals).");
      return;
    }
    if (!hasAnyFile) {
      setImportError("Please upload at least one file to import.");
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("platform", platform);
      // operatorId is resolved server-side from the auth session
      if (vehicleFile.file) formData.append("vehicle_list", vehicleFile.file);
      if (customerFile.file) formData.append("customer_list", customerFile.file);
      if (bookingFile.file) formData.append("booking_history", bookingFile.file);

      const res = await fetch("/api/migrations/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setImportError(json.error ?? "Import failed. Please try again.");
        return;
      }

      setResults(json);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Migration</h1>
        <p className="text-gray-500 mt-1">
          Import your vehicles, customers, and booking history from RentCentric or HQ Rentals.
          This is a one-time operation — you can re-run it and we'll skip duplicates.
        </p>
      </div>

      {/* Step 1 — Platform selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1 — What platform are you migrating from?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: "rentcentric",
                label: "RentCentric",
                sub: "ASP.NET-based fleet management",
              },
              {
                id: "hqrentals",
                label: "HQ Rentals",
                sub: "Modern SPA-based car rental software",
              },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id as Platform)}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                  platform === p.id
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div
                  className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                    platform === p.id ? "border-green-500 bg-green-500" : "border-gray-300"
                  }`}
                />
                <div>
                  <p className="font-medium text-sm text-gray-900">{p.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.sub}</p>
                </div>
              </button>
            ))}
          </div>

          {platform && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Need help exporting from {platform === "rentcentric" ? "RentCentric" : "HQ Rentals"}?</strong>{" "}
                <a
                  href={
                    platform === "rentcentric"
                      ? "mailto:support@pcrbooking.com?subject=RentCentric Export Help"
                      : "mailto:support@pcrbooking.com?subject=HQ Rentals Export Help"
                  }
                  className="underline"
                >
                  Email us
                </a>{" "}
                and we'll walk you through it.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — File uploads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 2 — Upload your export files</CardTitle>
          <CardDescription>
            All three files are optional — upload whichever you have. CSV format required (open Excel files in Excel/Google Sheets and Save As CSV first).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Vehicle list */}
          <div>
            <FileZone
              label="Vehicle List CSV"
              icon={<Car className="h-8 w-8" />}
              description={
                platform === "rentcentric"
                  ? "From Vehicles list → Export to Excel → save as CSV"
                  : platform === "hqrentals"
                  ? "From Fleet → Export → save as CSV"
                  : "Your fleet export from your current platform"
              }
              state={vehicleFile}
              onFile={handleFile(setVehicleFile)}
              onClear={() => setVehicleFile(EMPTY_FILE_STATE)}
            />
            {vehicleFile.preview.length > 0 && (
              <PreviewTable
                title="Vehicle list"
                headers={vehicleFile.headers}
                rows={vehicleFile.preview}
              />
            )}
          </div>

          {/* Customer list */}
          <div>
            <FileZone
              label="Customer List CSV"
              icon={<Users className="h-8 w-8" />}
              description={
                platform === "rentcentric"
                  ? "From Customers list → Export to Excel → save as CSV"
                  : platform === "hqrentals"
                  ? "From Customers → Export → save as CSV"
                  : "Your customer/renter export"
              }
              state={customerFile}
              onFile={handleFile(setCustomerFile)}
              onClear={() => setCustomerFile(EMPTY_FILE_STATE)}
            />
            {customerFile.preview.length > 0 && (
              <PreviewTable
                title="Customer list"
                headers={customerFile.headers}
                rows={customerFile.preview}
              />
            )}
          </div>

          {/* Booking history */}
          <div>
            <FileZone
              label="Booking History CSV"
              icon={<Calendar className="h-8 w-8" />}
              description={
                platform === "rentcentric"
                  ? "From Reservations or Rentals list → Export to Excel → save as CSV"
                  : platform === "hqrentals"
                  ? "From Reservations → Export → save as CSV"
                  : "Your reservation/booking history export"
              }
              state={bookingFile}
              onFile={handleFile(setBookingFile)}
              onClear={() => setBookingFile(EMPTY_FILE_STATE)}
            />
            {bookingFile.preview.length > 0 && (
              <PreviewTable
                title="Booking history"
                headers={bookingFile.headers}
                rows={bookingFile.preview}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 3 — Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 3 — Run the import</CardTitle>
          <CardDescription>
            Review the previews above, then click Import. Existing records (matched by license plate, email, or phone) will be updated rather than duplicated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary of what will be imported */}
          <div className="flex flex-wrap gap-2">
            {vehicleFile.file && (
              <Badge variant="secondary" className="gap-1.5">
                <Car className="h-3 w-3" />
                Vehicle list ready
              </Badge>
            )}
            {customerFile.file && (
              <Badge variant="secondary" className="gap-1.5">
                <Users className="h-3 w-3" />
                Customer list ready
              </Badge>
            )}
            {bookingFile.file && (
              <Badge variant="secondary" className="gap-1.5">
                <Calendar className="h-3 w-3" />
                Booking history ready
              </Badge>
            )}
            {!hasAnyFile && (
              <p className="text-sm text-gray-400">No files uploaded yet.</p>
            )}
          </div>

          {importError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {importError}
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={isImporting || !hasAnyFile || !platform}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white gap-2"
            size="lg"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                Import Now
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">Import Complete</h2>
          </div>

          {/* Overall summary */}
          <div className="rounded-xl bg-green-50 border border-green-100 p-4">
            <p className="text-sm text-green-800">
              <strong>{results.summary.total_imported}</strong> records imported successfully
              {results.summary.total_errors > 0 && (
                <span className="text-amber-700">
                  {" "}· <strong>{results.summary.total_errors}</strong> rows had errors (see details below)
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ResultCard
              title="Vehicles"
              icon={<Car className="h-4 w-4" />}
              imported={results.vehicles.imported}
              updated={results.vehicles.skipped}
              errors={results.vehicles.errors}
            />
            <ResultCard
              title="Customers"
              icon={<Users className="h-4 w-4" />}
              imported={results.customers.imported}
              updated={results.customers.skipped}
              errors={results.customers.errors}
            />
            <ResultCard
              title="Bookings"
              icon={<Calendar className="h-4 w-4" />}
              imported={results.bookings.imported}
              updated={results.bookings.skipped}
              errors={results.bookings.errors}
            />
          </div>

          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">What&apos;s next?</p>
            <ul className="space-y-1 text-sm">
              <li>
                <ArrowRight className="inline h-3.5 w-3.5 mr-1" />
                <a href="/dashboard/fleet" className="underline">Review your fleet</a> — verify vehicles imported correctly
              </li>
              <li>
                <ArrowRight className="inline h-3.5 w-3.5 mr-1" />
                <a href="/dashboard/renters" className="underline">Review your customers</a> — check contact info
              </li>
              <li>
                <ArrowRight className="inline h-3.5 w-3.5 mr-1" />
                <a href="/dashboard/bookings" className="underline">Review your bookings</a> — historical reservations are now in PCR Booking
              </li>
              <li>
                <ArrowRight className="inline h-3.5 w-3.5 mr-1" />
                <a href="/dashboard/settings" className="underline">Set up pricing</a> — configure your daily/weekly rates and protection plans
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Help callout */}
      {!results && (
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Prefer us to do the migration for you?
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Email your export files to{" "}
                  <a href="mailto:support@pcrbooking.com" className="text-green-600 underline">
                    support@pcrbooking.com
                  </a>{" "}
                  and we&apos;ll handle everything within 24 hours. It&apos;s free.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
