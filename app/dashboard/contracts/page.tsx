import { redirect } from "next/navigation";

/**
 * Contracts merged into Agreements (2026-08-09).
 * The legacy PDF-upload contract system is superseded by the
 * e-signature Agreements system. Old public signing links
 * remain functional; this admin page now redirects.
 */
export default function ContractsPage() {
  redirect("/dashboard/agreements");
}
