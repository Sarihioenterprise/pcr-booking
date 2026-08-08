import { NewBookingForm } from "./new-booking-form";

/**
 * New Booking page — server wrapper around the interactive client form.
 * The client component fetches vehicles via /api/vehicles on mount.
 */
export default function NewBookingPage() {
  return <NewBookingForm />;
}
