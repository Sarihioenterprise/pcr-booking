import { getOperator } from "@/lib/get-operator";
import { BookingWizard } from "@/app/components/booking-wizard/BookingWizard";

/**
 * New Booking — 9-step guided wizard.
 *
 * Server component: fetches operator from session, passes operatorId
 * to the client-side wizard so it can make operator-scoped API calls.
 */
export default async function NewBookingPage() {
  const operator = await getOperator();

  return <BookingWizard operatorId={operator.id} />;
}
