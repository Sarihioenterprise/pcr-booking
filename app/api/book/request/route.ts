import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operator_id, vehicle_id, vehicle_label, name, phone, email, start_date, end_date } = body;

    if (!operator_id || !name || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const datesNote = start_date && end_date
      ? `${start_date} to ${end_date}`
      : start_date || "";

    // Insert as a lead
    const { error } = await supabase.from("leads").insert({
      operator_id,
      name,
      phone: phone || null,
      email: email || null,
      dates_requested: vehicle_label ? `${vehicle_label} | ${datesNote}` : datesNote,
      stage: "new",
    });

    if (error) {
      // If the leads table has strict constraints, try a simpler insert
      const { error: err2 } = await supabase.from("leads").insert({
        operator_id,
        name,
        phone: phone || null,
        email: email || null,
        stage: "new",
      });

      if (err2) {
        return NextResponse.json({ error: err2.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
