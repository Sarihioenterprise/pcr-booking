import { redirect } from "next/navigation";

/** Contracts merged into Agreements (2026-08-09). */
export default function NewContractPage() {
  redirect("/dashboard/agreements");
}
