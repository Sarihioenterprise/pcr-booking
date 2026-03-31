import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

interface VehicleImport {
  make: string;
  model: string;
  year: number;
  color?: string;
  plate?: string;
  vin?: string;
  daily_rate: number;
  weekly_rate?: number;
  monthly_rate?: number;
  mileage?: number;
  category?: string;
}

export async function POST(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const { vehicles } = body as { vehicles: VehicleImport[] };

    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return NextResponse.json(
        { error: "No vehicles provided" },
        { status: 400 }
      );
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: { index: number; error: string }[] = [];

    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];

      // Validate required fields
      if (!v.make || !v.model || !v.year || v.daily_rate === undefined) {
        errorCount++;
        errors.push({
          index: i,
          error: "Missing required fields (make, model, year, daily_rate)",
        });
        continue;
      }

      const { error } = await supabase.from("vehicles").insert({
        operator_id: operator.id,
        make: v.make,
        model: v.model,
        year: Number(v.year),
        color: v.color || null,
        plate: v.plate || null,
        vin: v.vin || null,
        daily_rate: Number(v.daily_rate),
        weekly_rate: v.weekly_rate ? Number(v.weekly_rate) : null,
        monthly_rate: v.monthly_rate ? Number(v.monthly_rate) : null,
        mileage: v.mileage ? Number(v.mileage) : 0,
        category: v.category || "sedan",
        fuel_level: "full",
        minimum_rental_days: 1,
        status: "active",
      });

      if (error) {
        errorCount++;
        errors.push({ index: i, error: error.message });
      } else {
        successCount++;
      }
    }

    return NextResponse.json({
      success: true,
      imported: successCount,
      failed: errorCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
