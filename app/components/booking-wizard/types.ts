// Booking Wizard — shared types

export interface WizardAddon {
  id: string;
  name: string;
  description: string | null;
  pricing_type: "per_day" | "flat";
  price: number;
  category: string;
  required: boolean;
  quantity: number; // 1 = selected, 0 = not selected
  image_url?: string | null;
  highlight_text?: string | null;
}

export interface WizardVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  plate: string | null;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  category: string;
  photo_url: string | null;
  status: string;
  minimum_rental_days: number;
}

export interface WizardLocation {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
}

export interface InspectionZone {
  zone: "front" | "back" | "left" | "right";
  label: string;
  file: File | null;
  preview: string | null;
  path: string | null; // uploaded storage path
}

export interface WizardState {
  // Step 1 — Dates + Location
  start_date: string;
  start_time: string;
  end_date: string;
  return_time: string;
  location_id: string;
  location_name: string;

  // Step 2 — Vehicle
  vehicle: WizardVehicle | null;

  // Step 3 — Add-ons
  addons: WizardAddon[];
  addons_total: number;

  // Step 4 — Customer Info
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  dob: string;
  license_number: string;
  license_expiry: string;
  license_state: string;
  license_photo_path: string | null; // Supabase storage path
  renter_id: string | null; // created/found after step 4

  // Created after step 4 (before step 5)
  booking_id: string | null;
  booking_number: string | null;

  // Step 5 — Signature
  agreement_id: string | null;
  sign_token: string | null;
  signature_data_url: string | null; // base64 PNG

  // Step 6 — Payment
  payment_type: "pay_now" | "deposit" | "skip";
  payment_intent_id: string | null;
  payment_status: string | null;
  payment_client_secret: string | null;

  // Step 7 — Pickup Photos
  inspection_zones: InspectionZone[];
  pickup_inspection_id: string | null;

  // Derived
  duration_days: number;
  vehicle_subtotal: number;
  grand_total: number;
}

export type WizardAction =
  | { type: "SET_DATES"; payload: Pick<WizardState, "start_date" | "start_time" | "end_date" | "return_time" | "location_id" | "location_name" | "duration_days"> }
  | { type: "SET_VEHICLE"; payload: { vehicle: WizardVehicle; vehicle_subtotal: number; grand_total: number } }
  | { type: "SET_ADDONS"; payload: { addons: WizardAddon[]; addons_total: number; grand_total: number } }
  | { type: "SET_CUSTOMER"; payload: Pick<WizardState, "first_name" | "last_name" | "phone" | "email" | "dob" | "license_number" | "license_expiry" | "license_state" | "license_photo_path" | "renter_id"> }
  | { type: "SET_BOOKING"; payload: { booking_id: string; booking_number: string } }
  | { type: "SET_AGREEMENT"; payload: { agreement_id: string; sign_token: string; signature_data_url: string } }
  | { type: "SET_PAYMENT"; payload: Pick<WizardState, "payment_type" | "payment_intent_id" | "payment_status" | "payment_client_secret"> }
  | { type: "SET_INSPECTION"; payload: { pickup_inspection_id: string | null; inspection_zones: InspectionZone[] } }
  | { type: "UPDATE_ZONE"; payload: { zone: InspectionZone["zone"]; updates: Partial<InspectionZone> } };

export const INITIAL_STATE: WizardState = {
  start_date: "",
  start_time: "10:00",
  end_date: "",
  return_time: "10:00",
  location_id: "",
  location_name: "",
  vehicle: null,
  addons: [],
  addons_total: 0,
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  dob: "",
  license_number: "",
  license_expiry: "",
  license_state: "",
  license_photo_path: null,
  renter_id: null,
  booking_id: null,
  booking_number: null,
  agreement_id: null,
  sign_token: null,
  signature_data_url: null,
  payment_type: "pay_now",
  payment_intent_id: null,
  payment_status: null,
  payment_client_secret: null,
  inspection_zones: [
    { zone: "front", label: "Front", file: null, preview: null, path: null },
    { zone: "back", label: "Back", file: null, preview: null, path: null },
    { zone: "left", label: "Left Side", file: null, preview: null, path: null },
    { zone: "right", label: "Right Side", file: null, preview: null, path: null },
  ],
  pickup_inspection_id: null,
  duration_days: 0,
  vehicle_subtotal: 0,
  grand_total: 0,
};

export const STEP_LABELS = [
  "Dates",
  "Vehicle",
  "Add-ons",
  "Customer",
  "Signature",
  "Payment",
  "Photos",
  "Summary",
  "Done",
];
