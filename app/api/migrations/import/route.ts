/**
 * PCR Booking — White-Glove Data Migration Import API
 *
 * POST /api/migrations/import
 *
 * Accepts multipart/form-data with:
 *   - platform: "rentcentric" | "hqrentals"
 *   - operatorId: string (UUID)
 *   - vehicle_list: File (CSV)
 *   - customer_list: File (CSV)
 *   - booking_history: File (CSV)
 *
 * Returns:
 *   {
 *     vehicles: { imported: number; skipped: number; errors: RowError[] }
 *     customers: { imported: number; skipped: number; errors: RowError[] }
 *     bookings:  { imported: number; skipped: number; errors: RowError[] }
 *   }
 *
 * Column mappings are defined per-platform below.
 * Import is intentionally lenient — missing optional fields are silently skipped.
 * Vehicles are matched by plate or VIN for upsert.
 * Customers are matched by (operator_id + email) or (operator_id + phone) for upsert.
 * Bookings are always inserted as historical records (no upsert — duplicates
 *   are skipped only if start_date + end_date + renter_name already exist).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform = "rentcentric" | "hqrentals";

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

interface MigrationResult {
  vehicles: ImportResult;
  customers: ImportResult;
  bookings: ImportResult;
}

// ---------------------------------------------------------------------------
// Lightweight CSV parser (no dependencies)
// Handles: quoted fields, embedded commas, embedded newlines, CRLF, BOM
// ---------------------------------------------------------------------------

function parseCSV(raw: string): Record<string, string>[] {
  // Strip UTF-8 BOM if present
  const text = raw.startsWith("\uFEFF") ? raw.slice(1) : raw;
  const lines = splitCSVLines(text);
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitCSVLines(text: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function parseCSVRow(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

// ---------------------------------------------------------------------------
// Column maps — maps CSV header names → PCR Booking field names
// Supports multiple aliases per field (first match wins)
// ---------------------------------------------------------------------------

type ColumnMap = Record<string, string[]>;

const VEHICLE_COLUMNS: ColumnMap = {
  make:          ["Make", "Vehicle Make", "make"],
  model:         ["Model", "Vehicle Model", "model"],
  year:          ["Year", "Vehicle Year", "year", "Model Year"],
  color:         ["Color", "color", "Colour"],
  plate:         ["Plate #", "Plate", "License Plate", "License Plate #", "plate", "PlateNumber"],
  vin:           ["VIN #", "VIN", "vin", "VIN Number"],
  mileage:       ["Odometer", "Mileage", "mileage", "Current Odometer", "Miles"],
  category:      ["Vehicle Type", "Vehicle Class", "Class", "category", "Type"],
  status:        ["Status", "status", "Vehicle Status"],
  daily_rate:    ["Daily Rate", "Rate", "Daily Price", "daily_rate", "Price/Day"],
  weekly_rate:   ["Weekly Rate", "weekly_rate"],
  monthly_rate:  ["Monthly Rate", "monthly_rate"],
};

const CUSTOMER_COLUMNS: ColumnMap = {
  // We'll build full name from first+last or use a combined name field
  first_name:             ["First Name", "FirstName", "first_name"],
  last_name:              ["Last Name", "LastName", "last_name"],
  name:                   ["Full Name", "Name", "Customer Name", "name"],
  email:                  ["Email", "E-mail", "Email Address", "email"],
  phone:                  ["Cell Phone", "Phone", "phone", "Mobile", "Cell", "Phone Number"],
  drivers_license_number: ["Driver's License #", "License #", "DL #", "DL Number", "License Number", "Driver License", "drivers_license"],
  drivers_license_expiry: ["License Expiration", "DL Expiration", "License Exp", "License Expiry", "Expiration Date"],
  date_of_birth:          ["Date of Birth", "DOB", "Birthday", "Birth Date", "date_of_birth"],
  address:                ["Address 1", "Address", "Street", "Street Address", "address"],
  city:                   ["City", "city"],
  state:                  ["State", "state", "State/Province", "License State", "DL State"],
  zip:                    ["Zip", "Zip/Postal", "Postal Code", "zip", "Zip Code"],
  notes:                  ["Customer Notes", "Notes", "notes", "Comments"],
};

const BOOKING_COLUMNS: ColumnMap = {
  renter_name:   ["Full Name", "Name", "Customer", "Renter", "renter_name", "Customer Name"],
  first_name:    ["First Name", "FirstName"],
  last_name:     ["Last Name", "LastName"],
  renter_email:  ["Email", "E-mail", "email", "renter_email"],
  renter_phone:  ["Phone", "Cell Phone", "phone", "renter_phone", "Mobile"],
  start_date:    ["Pickup Date", "Start Date", "start_date", "Check-in", "Pickup", "Rental Start"],
  end_date:      ["Return Date", "End Date", "end_date", "Check-out", "Return", "Rental End"],
  vehicle:       ["Vehicle", "Vehicle ID", "Plate #", "License Plate", "Plate", "vehicle"],
  status:        ["Status", "status", "Reservation Status"],
  daily_rate:    ["Daily Rate", "Rate", "Daily Price", "daily_rate", "Rate/Day"],
  total_price:   ["Total", "Total Amount", "Total Price", "total_price", "Amount", "Total T&M"],
  duration_days: ["Number of Days", "Duration", "Days", "Rental Days", "Total Days"],
  notes:         ["Notes", "Memo", "notes", "Comments"],
};

// ---------------------------------------------------------------------------
// Field resolvers — pick first matching column from CSV row
// ---------------------------------------------------------------------------

function resolve(
  row: Record<string, string>,
  map: ColumnMap,
  field: string
): string {
  for (const alias of map[field] ?? []) {
    if (alias in row && row[alias] !== "") return row[alias];
  }
  return "";
}

// ---------------------------------------------------------------------------
// Status normalisers
// ---------------------------------------------------------------------------

function normaliseVehicleStatus(raw: string): "active" | "inactive" | "maintenance" {
  const s = raw.toLowerCase().trim();
  if (s.includes("repair") || s.includes("maintenance") || s.includes("service")) return "maintenance";
  if (s.includes("sold") || s.includes("inactive") || s.includes("deactivated") || s.includes("totaled") || s.includes("repossessed")) return "inactive";
  return "active"; // Available, On Rent, Reserved, Dirty, Returned, Complementary, New, etc.
}

function normaliseBookingStatus(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("complete") || s.includes("honor") || s.includes("closed")) return "completed";
  if (s.includes("active") || s.includes("rental") || s.includes("open") || s.includes("on rent")) return "active";
  if (s.includes("confirm")) return "confirmed";
  return "completed"; // Default historical records to completed
}

function normaliseCategory(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes("suv") || s.includes("sport utility")) return "suv";
  if (s.includes("luxury") || s.includes("exotic")) return "luxury";
  if (s.includes("truck") || s.includes("pickup")) return "truck";
  if (s.includes("van") || s.includes("minivan")) return "van";
  if (s.includes("electric") || s.includes(" ev")) return "electric";
  if (s.includes("economy") || s.includes("compact")) return "economy";
  return "sedan"; // Default
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  // Try MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, and ISO formats
  const cleaned = raw.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) return cleaned.slice(0, 10);
  // MM/DD/YYYY or MM-DD-YYYY
  const mdyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const year = y.length === 2 ? (parseInt(y) > 50 ? `19${y}` : `20${y}`) : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseNumber(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Platform-specific pre-processing hooks
// (These let us handle quirks from each platform's export format)
// ---------------------------------------------------------------------------

// RentCentric exports "First Name" + "Middle Name" + "Last Name" as separate cols for customers.
// HQ Rentals exports "First Name" + "Last Name".
// Both might also have "Full Name" in some exports.
function buildRenterName(row: Record<string, string>, colMap: ColumnMap): string {
  // Try combined name field first
  const combined = resolve(row, colMap, "name");
  if (combined) return combined;

  const first = resolve(row, colMap, "first_name");
  const last = resolve(row, colMap, "last_name");
  if (first || last) return `${first} ${last}`.trim();

  return "";
}

// ---------------------------------------------------------------------------
// Main import functions
// ---------------------------------------------------------------------------

async function importVehicles(
  rows: Record<string, string>[],
  operatorId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ result: ImportResult; vehicleMap: Record<string, string> }> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
  // Map plate → vehicle UUID for booking import
  const vehicleMap: Record<string, string> = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const make = resolve(row, VEHICLE_COLUMNS, "make");
      const model = resolve(row, VEHICLE_COLUMNS, "model");
      const yearRaw = resolve(row, VEHICLE_COLUMNS, "year");
      const year = parseInt(yearRaw) || null;

      if (!make || !model) {
        result.errors.push({ row: i + 2, data: row, reason: "Missing make or model" });
        continue;
      }
      if (!year || year < 1900 || year > new Date().getFullYear() + 2) {
        result.errors.push({ row: i + 2, data: row, reason: `Invalid year: "${yearRaw}"` });
        continue;
      }

      const plate = resolve(row, VEHICLE_COLUMNS, "plate") || null;
      const vin = resolve(row, VEHICLE_COLUMNS, "vin") || null;
      const colorRaw = resolve(row, VEHICLE_COLUMNS, "color");
      const mileageRaw = resolve(row, VEHICLE_COLUMNS, "mileage");
      const categoryRaw = resolve(row, VEHICLE_COLUMNS, "category");
      const statusRaw = resolve(row, VEHICLE_COLUMNS, "status");
      const dailyRateRaw = resolve(row, VEHICLE_COLUMNS, "daily_rate");
      const weeklyRateRaw = resolve(row, VEHICLE_COLUMNS, "weekly_rate");
      const monthlyRateRaw = resolve(row, VEHICLE_COLUMNS, "monthly_rate");

      const vehicleData = {
        operator_id: operatorId,
        make: make.trim(),
        model: model.trim(),
        year,
        color: colorRaw || null,
        plate: plate || null,
        vin: vin || null,
        mileage: parseNumber(mileageRaw) ?? 0,
        category: categoryRaw ? normaliseCategory(categoryRaw) : "sedan",
        status: statusRaw ? normaliseVehicleStatus(statusRaw) : "active",
        daily_rate: parseNumber(dailyRateRaw) ?? 0,
        weekly_rate: parseNumber(weeklyRateRaw) ?? null,
        monthly_rate: parseNumber(monthlyRateRaw) ?? null,
        fuel_level: "full",
        minimum_rental_days: 1,
      };

      // Try to upsert by plate, then VIN, then insert fresh
      let existingId: string | null = null;
      if (plate) {
        const { data } = await supabase
          .from("vehicles")
          .select("id")
          .eq("operator_id", operatorId)
          .eq("plate", plate)
          .maybeSingle();
        if (data) existingId = data.id;
      }
      if (!existingId && vin) {
        const { data } = await supabase
          .from("vehicles")
          .select("id")
          .eq("operator_id", operatorId)
          .eq("vin", vin)
          .maybeSingle();
        if (data) existingId = data.id;
      }

      if (existingId) {
        const { error } = await supabase
          .from("vehicles")
          .update(vehicleData)
          .eq("id", existingId);
        if (error) throw error;
        if (plate) vehicleMap[plate.toUpperCase()] = existingId;
        vehicleMap[existingId] = existingId;
        result.skipped++; // updated rather than fresh insert
      } else {
        const { data, error } = await supabase
          .from("vehicles")
          .insert(vehicleData)
          .select("id")
          .single();
        if (error) throw error;
        if (data) {
          if (plate) vehicleMap[plate.toUpperCase()] = data.id;
          result.imported++;
        }
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      result.errors.push({ row: i + 2, data: row, reason });
    }
  }

  return { result, vehicleMap };
}

async function importCustomers(
  rows: Record<string, string>[],
  operatorId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ result: ImportResult; customerMap: Record<string, string> }> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };
  // Map email/phone → renter UUID for booking import
  const customerMap: Record<string, string> = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const name = buildRenterName(row, CUSTOMER_COLUMNS);
      if (!name) {
        result.errors.push({ row: i + 2, data: row, reason: "Missing customer name" });
        continue;
      }

      const email = resolve(row, CUSTOMER_COLUMNS, "email") || null;
      const phone = resolve(row, CUSTOMER_COLUMNS, "phone") || null;

      // Need at least a name; email or phone is strongly preferred for deduplication
      const licenseExpiry = parseDate(resolve(row, CUSTOMER_COLUMNS, "drivers_license_expiry"));
      const dob = parseDate(resolve(row, CUSTOMER_COLUMNS, "date_of_birth"));

      const renterData = {
        operator_id: operatorId,
        name,
        email,
        phone: phone || null,
        drivers_license_number: resolve(row, CUSTOMER_COLUMNS, "drivers_license_number") || null,
        drivers_license_expiry: licenseExpiry || null,
        date_of_birth: dob || null,
        address: resolve(row, CUSTOMER_COLUMNS, "address") || null,
        city: resolve(row, CUSTOMER_COLUMNS, "city") || null,
        state: resolve(row, CUSTOMER_COLUMNS, "state") || null,
        zip: resolve(row, CUSTOMER_COLUMNS, "zip") || null,
        notes: resolve(row, CUSTOMER_COLUMNS, "notes") || null,
      };

      // Dedup by email or phone
      let existingId: string | null = null;
      if (email || phone) {
        const orParts = [
          email ? `email.eq.${email}` : null,
          phone ? `phone.eq.${phone}` : null,
        ].filter(Boolean);

        const { data } = await supabase
          .from("renters")
          .select("id")
          .eq("operator_id", operatorId)
          .or(orParts.join(","))
          .maybeSingle();
        if (data) existingId = data.id;
      }

      if (existingId) {
        await supabase.from("renters").update(renterData).eq("id", existingId);
        if (email) customerMap[email.toLowerCase()] = existingId;
        if (phone) customerMap[phone] = existingId;
        customerMap[name.toLowerCase()] = existingId;
        result.skipped++;
      } else {
        const { data, error } = await supabase
          .from("renters")
          .insert(renterData)
          .select("id")
          .single();
        if (error) throw error;
        if (data) {
          if (email) customerMap[email.toLowerCase()] = data.id;
          if (phone) customerMap[phone] = data.id;
          customerMap[name.toLowerCase()] = data.id;
          result.imported++;
        }
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      result.errors.push({ row: i + 2, data: row, reason });
    }
  }

  return { result, customerMap };
}

async function importBookings(
  rows: Record<string, string>[],
  operatorId: string,
  vehicleMap: Record<string, string>,
  customerMap: Record<string, string>,
  supabase: ReturnType<typeof createAdminClient>
): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const renterName = buildRenterName(row, BOOKING_COLUMNS);
      const startDateRaw = resolve(row, BOOKING_COLUMNS, "start_date");
      const endDateRaw = resolve(row, BOOKING_COLUMNS, "end_date");

      if (!renterName) {
        result.errors.push({ row: i + 2, data: row, reason: "Missing renter name" });
        continue;
      }

      const startDate = parseDate(startDateRaw);
      const endDate = parseDate(endDateRaw);

      if (!startDate) {
        result.errors.push({ row: i + 2, data: row, reason: `Invalid pickup date: "${startDateRaw}"` });
        continue;
      }
      if (!endDate) {
        result.errors.push({ row: i + 2, data: row, reason: `Invalid return date: "${endDateRaw}"` });
        continue;
      }

      // Skip duplicates: same operator + renter_name + start_date + end_date
      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("operator_id", operatorId)
        .eq("renter_name", renterName)
        .eq("start_date", startDate)
        .eq("end_date", endDate)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        continue;
      }

      // Resolve vehicle_id
      const vehicleRaw = resolve(row, BOOKING_COLUMNS, "vehicle");
      let vehicleId: string | null = null;
      if (vehicleRaw) {
        vehicleId =
          vehicleMap[vehicleRaw.toUpperCase()] ??
          vehicleMap[vehicleRaw] ??
          null;
      }

      // Resolve renter_id from customer map (email → id or name → id)
      const emailRaw = resolve(row, BOOKING_COLUMNS, "renter_email");
      const phoneRaw = resolve(row, BOOKING_COLUMNS, "renter_phone");
      let renterId: string | null = null;
      if (emailRaw) renterId = customerMap[emailRaw.toLowerCase()] ?? null;
      if (!renterId && phoneRaw) renterId = customerMap[phoneRaw] ?? null;
      if (!renterId) renterId = customerMap[renterName.toLowerCase()] ?? null;

      const statusRaw = resolve(row, BOOKING_COLUMNS, "status");
      const dailyRate = parseNumber(resolve(row, BOOKING_COLUMNS, "daily_rate")) ?? 0;
      const totalPriceRaw = resolve(row, BOOKING_COLUMNS, "total_price");
      const durationRaw = resolve(row, BOOKING_COLUMNS, "duration_days");

      // Calculate duration
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const durationDays = parseInt(durationRaw) || diffDays;

      const totalPrice = parseNumber(totalPriceRaw) ?? (dailyRate * durationDays);

      const { error } = await supabase.from("bookings").insert({
        operator_id: operatorId,
        vehicle_id: vehicleId,
        renter_id: renterId,
        renter_name: renterName,
        renter_email: emailRaw || null,
        renter_phone: phoneRaw || null,
        start_date: startDate,
        end_date: endDate,
        duration_days: durationDays,
        daily_rate: dailyRate,
        total_price: totalPrice,
        tax_amount: 0,
        discount_amount: 0,
        deposit_amount: 0,
        deposit_status: "none",
        status: statusRaw ? normaliseBookingStatus(statusRaw) : "completed",
        notes: resolve(row, BOOKING_COLUMNS, "notes") || "Imported from migration",
      });

      if (error) throw error;
      result.imported++;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      result.errors.push({ row: i + 2, data: row, reason });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();

    const platform = (formData.get("platform") as string ?? "").toLowerCase() as Platform;
    if (!["rentcentric", "hqrentals"].includes(platform)) {
      return NextResponse.json(
        { error: 'platform must be "rentcentric" or "hqrentals"' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Resolve operatorId: prefer session (server-side auth), fall back to form body
    let operatorId: string;
    try {
      const sessionOperator = await getOperator();
      operatorId = sessionOperator.id;
    } catch {
      // Not authenticated via session — check form body (admin tool usage)
      const bodyOperatorId = formData.get("operatorId") as string | null;
      if (!bodyOperatorId || bodyOperatorId === "from_session") {
        return NextResponse.json({ error: "Not authenticated. Please log in and try again." }, { status: 401 });
      }
      // Verify operator exists
      const { data: operator, error: opErr } = await supabase
        .from("operators")
        .select("id")
        .eq("id", bodyOperatorId)
        .single();
      if (opErr || !operator) {
        return NextResponse.json({ error: "Operator not found" }, { status: 404 });
      }
      operatorId = bodyOperatorId;
    }

    const results: MigrationResult = {
      vehicles: { imported: 0, skipped: 0, errors: [] },
      customers: { imported: 0, skipped: 0, errors: [] },
      bookings: { imported: 0, skipped: 0, errors: [] },
    };

    let vehicleMap: Record<string, string> = {};
    let customerMap: Record<string, string> = {};

    // --- Vehicles ---
    const vehicleFile = formData.get("vehicle_list") as File | null;
    if (vehicleFile && vehicleFile.size > 0) {
      const text = await vehicleFile.text();
      const rows = parseCSV(text);
      const { result, vehicleMap: vm } = await importVehicles(rows, operatorId, supabase);
      results.vehicles = result;
      vehicleMap = vm;
    }

    // --- Customers ---
    const customerFile = formData.get("customer_list") as File | null;
    if (customerFile && customerFile.size > 0) {
      const text = await customerFile.text();
      const rows = parseCSV(text);
      const { result, customerMap: cm } = await importCustomers(rows, operatorId, supabase);
      results.customers = result;
      customerMap = cm;
    }

    // --- Bookings ---
    const bookingFile = formData.get("booking_history") as File | null;
    if (bookingFile && bookingFile.size > 0) {
      const text = await bookingFile.text();
      const rows = parseCSV(text);
      results.bookings = await importBookings(rows, operatorId, vehicleMap, customerMap, supabase);
    }

    const totalImported =
      results.vehicles.imported +
      results.customers.imported +
      results.bookings.imported;

    const totalErrors =
      results.vehicles.errors.length +
      results.customers.errors.length +
      results.bookings.errors.length;

    return NextResponse.json({
      success: true,
      platform,
      summary: {
        vehicles_imported: results.vehicles.imported,
        vehicles_updated: results.vehicles.skipped,
        customers_imported: results.customers.imported,
        customers_updated: results.customers.skipped,
        bookings_imported: results.bookings.imported,
        bookings_skipped: results.bookings.skipped,
        total_imported: totalImported,
        total_errors: totalErrors,
      },
      details: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[migrations/import] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
