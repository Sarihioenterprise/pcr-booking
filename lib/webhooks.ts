import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";

export type WebhookEvent =
  | "renter.created"
  | "booking.confirmed"
  | "booking.completed"
  | "contract.sent"
  | "contract.signed"
  | "payment.received"
  | "payment.failed"
  | "payment.overdue";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: number;
  data: Record<string, any>;
}

/**
 * Fire webhooks for a given operator and event.
 * Fetches all enabled webhooks that subscribe to the event,
 * signs with HMAC-SHA256, and fires them asynchronously.
 */
export async function fireWebhook(
  operatorId: string,
  event: WebhookEvent,
  payload: Record<string, any>
) {
  try {
    const supabase = await createClient();

    // Fetch all enabled webhooks for this operator that subscribe to this event
    const { data: webhooks, error } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("operator_id", operatorId)
      .eq("is_active", true);

    if (error) {
      console.error("[Webhooks] Error fetching webhooks:", error);
      return;
    }

    if (!webhooks || webhooks.length === 0) {
      return; // No webhooks configured
    }

    // Filter webhooks that subscribe to this event
    const relevantWebhooks = webhooks.filter((hook: any) =>
      hook.events?.includes(event)
    );

    if (relevantWebhooks.length === 0) {
      return; // No webhooks subscribe to this event
    }

    const webhookPayload: WebhookPayload = {
      event,
      timestamp: Date.now(),
      data: payload,
    };

    // Fire all webhooks asynchronously (don't await)
    relevantWebhooks.forEach((webhook: any) => {
      fireWebhookAsync(webhook, webhookPayload);
    });
  } catch (error) {
    console.error("[Webhooks] Error in fireWebhook:", error);
  }
}

/**
 * Asynchronously fire a single webhook.
 */
async function fireWebhookAsync(
  webhook: any,
  payload: WebhookPayload
) {
  try {
    const bodyJson = JSON.stringify(payload);

    // Sign the request with HMAC-SHA256 if secret is present
    let signature = "";
    if (webhook.secret) {
      signature = crypto
        .createHmac("sha256", webhook.secret)
        .update(bodyJson)
        .digest("hex");
    }

    // POST to the webhook URL
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature && { "X-PCR-Signature": signature }),
      },
      body: bodyJson,
    });

    if (response.ok) {
      console.log(
        `[Webhooks] Successfully fired webhook ${webhook.id} for event ${payload.event}`
      );
    } else {
      console.warn(
        `[Webhooks] Webhook ${webhook.id} returned status ${response.status}`
      );
    }
  } catch (error) {
    console.error(
      `[Webhooks] Error firing webhook ${webhook.id}:`,
      error
    );
  }
}
