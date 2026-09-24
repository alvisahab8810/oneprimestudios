// lib/returnRules.js — who may raise a return/refund request, and for how long.
// Returns are a B2C-only feature; partner (B2B) orders are settled through
// the wallet and are handled by the sales team instead.

export const RETURN_WINDOW_DAYS = 7;

export const RETURN_REASONS = [
  "Damaged item",
  "Printing / quality issue",
  "Wrong item delivered",
  "Missing items",
  "Item not as described",
  "Other",
];

export const RETURN_STATUSES = [
  "Requested",
  "Approved",
  "Rejected",
  "Pickup Scheduled",
  "Item Received",
  "Refunded",
  "Closed",
];

// Statuses that still need someone to act on them
export const OPEN_RETURN_STATUSES = [
  "Requested",
  "Approved",
  "Pickup Scheduled",
  "Item Received",
];

export const isB2CUser = (user) =>
  String(user?.userType || "customer").toLowerCase() === "customer";

export const daysSince = (date) =>
  date ? Math.floor((Date.now() - new Date(date).getTime()) / 86400000) : null;

// Returns "" when the customer may raise a request, otherwise the reason why not.
export function checkReturnEligibility(order, user) {
  if (!order) return "Order not found";
  if (!isB2CUser(user)) return "Returns are available for retail orders only";
  if (order.status !== "Order Delivered")
    return "A return can be raised only after the order is delivered";

  const delivered = order.deliveredAt || order.updatedAt;
  const days = daysSince(delivered);
  if (days !== null && days > RETURN_WINDOW_DAYS)
    return `The ${RETURN_WINDOW_DAYS}-day return window for this order has closed`;

  return "";
}

export const canRequestReturn = (order, user) => !checkReturnEligibility(order, user);

// Badge colours shared by the admin list, the admin detail page and the
// customer's order page, so one status always looks the same everywhere.
export const RETURN_STATUS_STYLES = {
  Requested: { background: "#fef9c3", color: "#854d0e" },
  Approved: { background: "#dbeafe", color: "#1d4ed8" },
  Rejected: { background: "#fee2e2", color: "#b91c1c" },
  "Pickup Scheduled": { background: "#ede9fe", color: "#6d28d9" },
  "Item Received": { background: "#e0f2fe", color: "#0369a1" },
  Refunded: { background: "#dcfce7", color: "#15803d" },
  Closed: { background: "#f1f5f9", color: "#475569" },
};

// What the admin may set next from a given status. Keeps the dropdown honest.
export const NEXT_RETURN_STATUSES = {
  Requested: ["Approved", "Rejected"],
  Approved: ["Pickup Scheduled", "Rejected", "Closed"],
  "Pickup Scheduled": ["Item Received", "Closed"],
  "Item Received": ["Refunded", "Closed"],
  Refunded: ["Closed"],
  Rejected: ["Closed"],
  Closed: [],
};
