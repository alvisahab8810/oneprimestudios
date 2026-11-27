// lib/nonDelivery.js
// Recognises courier statuses that mean a parcel did not reach the buyer:
// failed delivery attempts (NDR), returns to origin (RTO), lost or damaged.
// Shared by the courier status mapping and the "Not Delivered" admin page.

// Matches the wording Shiprocket and its couriers use for these states
export const NON_DELIVERY_PATTERN =
  "undeliver|not delivered|delivery failed|failed delivery|\\bndr\\b|\\brto\\b|return to origin|returned to origin|" +
  "lost|damaged|destroyed|untraceable|misrouted|disposed|issue related to the recipient|reached back at seller";

const NON_DELIVERY_RE = new RegExp(NON_DELIVERY_PATTERN, "i");

export function isNonDeliveryStatus(status) {
  return NON_DELIVERY_RE.test(String(status || ""));
}

// Groups a status into what the admin has to do about it
export const ISSUE_GROUPS = {
  failed: { label: "Delivery failed", hint: "The courier could not deliver. Re-attempt or return." },
  returning: { label: "Returning to us", hint: "The parcel is on its way back." },
  returned: { label: "Returned to us", hint: "The parcel is back at the pickup address." },
  lost: { label: "Lost or damaged", hint: "Raise a claim with the courier." },
};

export function issueGroup(status) {
  const s = String(status || "").toLowerCase();
  if (/lost|damaged|destroyed|untraceable|disposed/.test(s)) return "lost";
  if (/rto delivered|returned to origin|reached back at seller/.test(s)) return "returned";
  if (/\brto\b|return to origin/.test(s)) return "returning";
  return "failed";
}
