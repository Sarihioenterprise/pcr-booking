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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4 | 5;

const VEHICLE_FIELDS = [
  { key: "make", label: "Make", required: true },
  { key: "model", label: "Model", required: true },
  { key: "year", label: "Year", required: true },
  { key: "color", label: "Color", required: false },
  { key: "plate", label: "License Plate", required: false },
  { key: "vin", label: "VIN", required: false },
  { key: "daily_rate", label: "Daily Rate", required: true },
  { key: "weekly_rate", label: "Weekly Rate", required: false },
  { key: "monthly_rate", label: "Monthly Rate", required: false },
  { key: "mileage", label: "Mileage", required: false },
  { key: "category", label: "Category", required: false },
] as const;

// Pre-built column mappings for known formats
const TURO_MAPPINGS: Record<string, string> = {
  "Vehicle Make": "make",
  Make: "make",
  "Vehicle Model": "model",
  Model: "model",
  Year: "year",
  "Vehicle Year": "year",
  Color: "color",
  "License Plate": "plate",
  Plate: "plate",
  VIN: "vin",
  "Daily Price": "daily_rate",
  "Daily Rate": "daily_rate",
  "Price Per Day": "daily_rate",
  "Weekly Price": "weekly_rate",
  "Monthly Price": "monthly_rate",
  Mileage: "mileage",
  "Vehicle Type": "category",
  Category: "category",
  Type: "category",
};

const GETAROUND_MAPPINGS: Record<string, string> = {
  make: "make",
  model: "model",
  year: "year",
  color: "color",
  license_plate: "plate",
  plate_number: "plate",
  vin_number: "vin",
  vin: "vin",
  price_per_day: "daily_rate",
  daily_price: "daily_rate",
  weekly_price: "weekly_rate",
  monthly_price: "monthly_rate",
  odometer: "mileage",
  mileage: "mileage",
  vehicle_type: "category",
  category: "category",
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
}

function autoDetectMappings(
  headers: string[]
): Record<string, string> {
  const mappings: Record<string, string> = {};

  for (const header of headers) {
    const normalized = header.trim();
    // Check Turo mappings first
    if (TURO_MAPPINGS[normalized]) {
      mappings[normalized] = TURO_MAPPINGS[normalized];
      continue;
    }
    // Check Getaround mappings
    const lower = normalized.toLowerCase().replace(/\s+/g, "_");
    if (GETAROUND_MAPPINGS[lower]) {
      mappings[normalized] = GETAROUND_MAPPINGS[lower];
      continue;
    }
    // Try fuzzy match
    const lowerPlain = normalized.toLowerCase();
    for (const field of VEHICLE_FIELDS) {
      if (lowerPlain.includes(field.key.replace("_", " ")) || lowerPlain.includes(field.key)) {
        mappings[normalized] = field.key;
        break;
      }
    }
  }

  return mappings;
}

export default function ImporterPage() {
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    failed: number;
    errors?: { index: number; error: string }[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      setHeaders(h);
      setRows(r);
      const autoMappings = autoDetectMappings(h);
      setMappings(autoMappings);
      setStep(2);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".csv")) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  function getMappedData(): Record<string, string | number>[] {
    return rows.map((row) => {
      const obj: Record<string, string | number> = {};
      headers.forEach((header, idx) => {
        const field = mappings[header];
        if (field && row[idx] !== undefined) {
          const val = row[idx];
          if (["year", "daily_rate", "weekly_rate", "monthly_rate", "mileage"].includes(field)) {
            const num = parseFloat(val.replace(/[$,]/g, ""));
            if (!isNaN(num)) obj[field] = num;
          } else {
            obj[field] = val;
          }
        }
      });
      return obj;
    });
  }

  async function handleImport() {
    setImporting(true);
    const vehicles = getMappedData();
    try {
      const res = await fetch("/api/fleet/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicles }),
      });
      const data = await res.json();
      setResult({
        imported: data.imported || 0,
        failed: data.failed || 0,
        errors: data.errors,
      });
      setStep(5);
    } catch {
      setResult({ imported: 0, failed: vehicles.length });
      setStep(5);
    } finally {
      setImporting(false);
    }
  }

  const mappedCount = Object.values(mappings).filter(Boolean).length;
  const requiredMapped = VEHICLE_FIELDS.filter(
    (f) => f.required && Object.values(mappings).includes(f.key)
  ).length;
  const requiredTotal = VEHICLE_FIELDS.filter((f) => f.required).length;

  return (
    <div className="space-y-6" style={{ background: "#F8F9FC", minHeight: "100%" }}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CSV Importer</h1>
        <p className="text-gray-500">
          Import vehicles from Turo, Getaround, or other platforms
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === s
                  ? "bg-[#2EBD6B] text-white"
                  : step > s
                    ? "bg-emerald-100 text-[#2EBD6B]"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {step > s ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                s
              )}
            </div>
            {s < 5 && (
              <div
                className={`h-0.5 w-8 ${step > s ? "bg-[#2EBD6B]" : "bg-gray-200"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle>Upload CSV File</CardTitle>
            <CardDescription>
              Drag and drop your CSV file or click to browse. Supports Turo and
              Getaround export formats.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 cursor-pointer transition-colors ${
                dragOver
                  ? "border-[#2EBD6B] bg-emerald-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
                <Upload className="h-7 w-7 text-[#2EBD6B]" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">
                  Drop your CSV file here
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  or click to browse files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview Data</CardTitle>
                <CardDescription>
                  <FileSpreadsheet className="inline h-4 w-4 mr-1" />
                  {fileName} — {rows.length} rows found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h, i) => (
                      <TableHead key={i} className="whitespace-nowrap text-xs">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => (
                        <TableCell
                          key={j}
                          className="whitespace-nowrap text-xs"
                        >
                          {cell || "—"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > 10 && (
              <p className="text-xs text-gray-400 mt-2">
                Showing first 10 of {rows.length} rows
              </p>
            )}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setHeaders([]);
                  setRows([]);
                  setFileName("");
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-[#2EBD6B] hover:bg-[#1a9952] text-white"
              >
                Map Columns
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Column Mapping */}
      {step === 3 && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Map your CSV columns to vehicle fields. {mappedCount} of{" "}
              {headers.length} columns mapped. Required fields:{" "}
              {requiredMapped}/{requiredTotal} mapped.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {headers.map((header) => (
                <div
                  key={header}
                  className="flex items-center gap-4 rounded-lg border border-gray-100 p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {header}
                    </p>
                    <p className="text-xs text-gray-400">CSV Column</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                  <select
                    value={mappings[header] || ""}
                    onChange={(e) =>
                      setMappings((prev) => ({
                        ...prev,
                        [header]: e.target.value,
                      }))
                    }
                    className="w-48 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30 focus:border-[#2EBD6B]"
                  >
                    <option value="">Skip this column</option>
                    {VEHICLE_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                        {f.required ? " *" : ""}
                      </option>
                    ))}
                  </select>
                  {mappings[header] && (
                    <CheckCircle2 className="h-4 w-4 text-[#2EBD6B]" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={requiredMapped < requiredTotal}
                className="bg-[#2EBD6B] hover:bg-[#1a9952] text-white"
              >
                Review
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Import */}
      {step === 4 && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle>Review & Import</CardTitle>
            <CardDescription>
              {rows.length} vehicles ready to import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    {VEHICLE_FIELDS.filter((f) =>
                      Object.values(mappings).includes(f.key)
                    ).map((f) => (
                      <TableHead key={f.key} className="whitespace-nowrap text-xs">
                        {f.label}
                        {f.required && (
                          <span className="text-red-500 ml-0.5">*</span>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getMappedData()
                    .slice(0, 10)
                    .map((vehicle, i) => (
                      <TableRow key={i}>
                        {VEHICLE_FIELDS.filter((f) =>
                          Object.values(mappings).includes(f.key)
                        ).map((f) => (
                          <TableCell
                            key={f.key}
                            className="whitespace-nowrap text-xs"
                          >
                            {vehicle[f.key] !== undefined
                              ? String(vehicle[f.key])
                              : "—"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            {rows.length > 10 && (
              <p className="text-xs text-gray-400 mt-2">
                Showing first 10 of {rows.length} vehicles
              </p>
            )}

            <div className="flex items-center justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing}
                className="bg-[#2EBD6B] hover:bg-[#1a9952] text-white"
              >
                {importing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {rows.length} Vehicles
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Results */}
      {step === 5 && result && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle>Import Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
                <CheckCircle2 className="h-8 w-8 text-[#2EBD6B]" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {result.imported}
                  </p>
                  <p className="text-sm text-gray-500">Successfully imported</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {result.failed}
                  </p>
                  <p className="text-sm text-gray-500">Failed</p>
                </div>
              </div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Errors</h4>
                {result.errors.slice(0, 10).map((err, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2"
                  >
                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">
                      Row {err.index + 1}: {err.error}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setHeaders([]);
                  setRows([]);
                  setFileName("");
                  setResult(null);
                  setMappings({});
                }}
              >
                Import More
              </Button>
              <Button
                onClick={() => (window.location.href = "/dashboard/fleet")}
                className="bg-[#2EBD6B] hover:bg-[#1a9952] text-white"
              >
                View Fleet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
