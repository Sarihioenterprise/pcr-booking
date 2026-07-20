import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();

  // Get current user
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get operator
  const { data: operator, error: operatorError } = await supabase
    .from("operators")
    .select("id, stripe_account_id")
    .eq("user_id", userData.user.id)
    .single();

  if (operatorError || !operator) {
    return new Response(
      JSON.stringify({ error: "Operator not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!operator.stripe_account_id) {
    return new Response(
      JSON.stringify({ error: "Not connected to Stripe" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Disconnect Stripe account
  const { error: updateError } = await supabase
    .from("operators")
    .update({
      stripe_account_id: null,
      stripe_connect_status: "not_connected",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userData.user.id);

  if (updateError) {
    console.error("Failed to disconnect Stripe:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to disconnect" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`Disconnected Stripe for operator ${operator.id}`);

  return new Response(
    JSON.stringify({ success: true, message: "Stripe disconnected" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
