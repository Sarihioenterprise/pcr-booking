import { getOperator } from "@/lib/get-operator";
import { CollectionsGate } from "@/components/dashboard/collections-gate";
import { CollectionsClient } from "./collections-client";

export default async function CollectionsPage() {
  await getOperator();
  // Collections is available to all paid plans (free tier retired).
  return <CollectionsClient />;
}
