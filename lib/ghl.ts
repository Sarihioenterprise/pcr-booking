/**
 * GHL (GoHighLevel) integration for syncing PCR Booking operators
 * into Alton's GHL account for tracking signups, subscriptions, and payments
 */

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_BASE_URL = "https://services.leadconnectorhq.com";

export interface GHLContact {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  name?: string; // business name
  tags?: string[];
  customFields?: Array<{
    key: string;
    field_value: string;
  }>;
}

/**
 * Make an authenticated request to the GHL API
 */
async function ghlRequest(
  method: string,
  endpoint: string,
  body?: Record<string, any>
): Promise<any> {
  if (!GHL_API_KEY || !GHL_LOCATION_ID) {
    console.warn("[GHL] Missing GHL_API_KEY or GHL_LOCATION_ID");
    return null;
  }

  const url = `${GHL_BASE_URL}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${GHL_API_KEY}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[GHL] ${method} ${endpoint} failed:`, response.status, error);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[GHL] Request error (${method} ${endpoint}):`, error);
    return null;
  }
}

/**
 * Create or update a contact in GHL by email (upsert)
 * Returns the contact data including contactId
 */
export async function createOrUpdateContact(operator: {
  id: string; // PCR operator ID — stored as custom field
  owner_name: string;
  business_name: string;
  phone?: string | null;
  business_email?: string | null;
  plan?: string;
  stripe_subscription_id?: string | null;
  stripe_connect_status?: string | null;
}): Promise<any> {
  const email = operator.business_email || `operator-${operator.id}@pcrbooking.local`;
  const firstName = operator.owner_name?.split(" ")[0] || "Operator";
  const lastName = operator.owner_name?.split(" ")[1] || "";

  const contact: GHLContact = {
    email,
    firstName,
    lastName,
    phone: operator.phone || undefined,
    name: operator.business_name,
    tags: ["pcr-booking"],
    customFields: [
      {
        key: "pcr_booking_operator_id",
        field_value: operator.id,
      },
    ],
  };

  // Add plan if available
  if (operator.plan) {
    contact.customFields!.push({
      key: "plan",
      field_value: operator.plan,
    });
  }

  const payload = {
    locationId: GHL_LOCATION_ID,
    ...contact,
  };

  const result = await ghlRequest("POST", "/contacts/upsert", payload);

  if (result?.contact?.id) {
    console.log(
      `[GHL] Created/updated contact for ${operator.business_name} (${email}):`,
      result.contact.id
    );
    return result.contact;
  }

  return null;
}

/**
 * Add a tag to a GHL contact
 */
export async function addTag(
  contactId: string,
  tag: string
): Promise<boolean> {
  const payload = {
    locationId: GHL_LOCATION_ID,
    tags: [tag],
  };

  const result = await ghlRequest("PUT", `/contacts/${contactId}`, payload);
  if (result?.contact?.id) {
    console.log(`[GHL] Added tag "${tag}" to contact ${contactId}`);
    return true;
  }

  return false;
}

/**
 * Remove a tag from a GHL contact
 */
export async function removeTag(
  contactId: string,
  tag: string
): Promise<boolean> {
  // GHL API requires passing all tags you want to keep
  // This is a simplified version that attempts to remove
  const payload = {
    locationId: GHL_LOCATION_ID,
    tags: [tag],
  };

  // Note: GHL's remove tag endpoint may vary; this uses PUT with tags
  // You may need to adjust based on actual GHL API response
  const result = await ghlRequest(
    "PUT",
    `/contacts/${contactId}/tags`,
    payload
  );

  if (result) {
    console.log(`[GHL] Removed tag "${tag}" from contact ${contactId}`);
    return true;
  }

  return false;
}

/**
 * Add a note/activity to a GHL contact
 */
export async function addNote(contactId: string, note: string): Promise<boolean> {
  const payload = {
    locationId: GHL_LOCATION_ID,
    body: note,
  };

  const result = await ghlRequest("POST", `/contacts/${contactId}/notes`, payload);

  if (result?.id) {
    console.log(`[GHL] Added note to contact ${contactId}:`, note.substring(0, 50));
    return true;
  }

  return false;
}

/**
 * Add an activity/event to a GHL contact
 */
export async function addActivity(
  contactId: string,
  type: string,
  message: string
): Promise<boolean> {
  const payload = {
    locationId: GHL_LOCATION_ID,
    type,
    text: message,
  };

  const result = await ghlRequest("POST", `/contacts/${contactId}/activities`, payload);

  if (result?.id) {
    console.log(`[GHL] Added activity to contact ${contactId}:`, message.substring(0, 50));
    return true;
  }

  return false;
}

/**
 * Fire-and-forget helper: get or create contact and add tag + note
 * Used for key events like signup, subscription, etc.
 */
export async function fireGHLEvent(
  operator: any,
  tag: string,
  note: string,
  additionalTags?: string[]
): Promise<void> {
  try {
    // Create/update contact
    const contact = await createOrUpdateContact(operator);
    if (!contact?.id) {
      console.warn("[GHL] Failed to create/update contact for event:", operator.id);
      return;
    }

    const contactId = contact.id;

    // Add primary tag
    await addTag(contactId, tag);

    // Add any additional tags
    if (additionalTags) {
      for (const additionalTag of additionalTags) {
        await addTag(contactId, additionalTag);
      }
    }

    // Add note
    await addNote(contactId, note);
  } catch (error) {
    console.error("[GHL] Error firing event:", error);
    // Silently fail — don't block main request
  }
}
