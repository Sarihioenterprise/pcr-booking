import { getOperator } from "@/lib/get-operator";
import { CollectionsGate } from "@/components/dashboard/collections-gate";
import { CollectionsClient } from "./collections-client";

export default async function CollectionsPage() {
  const operator = await getOperator();

  // Show upgrade gate for free plan users
  if (operator.plan === "free") {
    return <CollectionsGate operatorPlan={operator.plan} />;
  }

  return <CollectionsClient />;
}
