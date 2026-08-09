import { NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";

const SEED_ADDONS = [
  // Insurance / Protection
  {
    name: "Collision Damage Waiver",
    description: "Limits your liability for damage to the rental vehicle.",
    pricing_type: "per_day",
    price: 15.00,
    category: "insurance",
    required: false,
    sort_order: 1,
  },
  {
    name: "Supplemental Liability Insurance",
    description: "Additional liability protection up to $1,000,000.",
    pricing_type: "per_day",
    price: 12.00,
    category: "insurance",
    required: false,
    sort_order: 2,
  },
  {
    name: "Personal Accident Insurance",
    description: "Covers medical expenses for you and your passengers.",
    pricing_type: "per_day",
    price: 5.00,
    category: "insurance",
    required: false,
    sort_order: 3,
  },
  // Extras
  {
    name: "GPS Navigation Unit",
    description: "Portable GPS device for hassle-free navigation.",
    pricing_type: "per_day",
    price: 8.00,
    category: "extra",
    required: false,
    sort_order: 10,
  },
  {
    name: "Child Safety Seat",
    description: "Certified child seat (infant, toddler, or booster).",
    pricing_type: "flat",
    price: 40.00,
    category: "extra",
    required: false,
    sort_order: 11,
  },
  {
    name: "Additional Driver",
    description: "Add a second authorized driver to your rental.",
    pricing_type: "flat",
    price: 30.00,
    category: "extra",
    required: false,
    sort_order: 12,
  },
  {
    name: "Vehicle Delivery",
    description: "We deliver and pick up the vehicle at your location.",
    pricing_type: "flat",
    price: 75.00,
    category: "extra",
    required: false,
    sort_order: 13,
  },
  {
    name: "After-Hours Pickup/Return",
    description: "Flexible pickup or return outside of business hours.",
    pricing_type: "flat",
    price: 50.00,
    category: "extra",
    required: false,
    sort_order: 14,
  },
] as const;

// POST /api/addons/seed — seed standard add-on templates for an operator
export async function POST() {
  try {
    const operator = await getOperator();
    const supabase = createAdminClient();

    // Only seed if the table exists
    const toInsert = SEED_ADDONS.map((a) => ({
      ...a,
      operator_id: operator.id,
      active: true,
    }));

    const { data, error } = await supabase
      .from("addons")
      .insert(toInsert)
      .select();

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json(
          { error: "Add-ons table not yet created. Please apply migration 018 first." },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, created: data?.length ?? 0 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
