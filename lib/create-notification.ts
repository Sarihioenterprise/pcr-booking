import { createAdminClient } from "@/lib/supabase/admin";

export async function createNotification(
  operatorId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      operator_id: operatorId,
      type,
      title,
      message,
      link: link || null,
      is_read: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create notification:", error);
    return null;
  }

  return data;
}
