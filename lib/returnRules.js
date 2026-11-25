// lib/returnRules.js — who may raise a return, exchange or refund request, and
// for how long. All three are a B2C-only feature; partner (B2B) orders are
// settled through the wallet and are handled by the sales team instead.
//
// orderRules is the only import, and it has none of its own, so this file is
// still safe to use on the client.
import { hasNoReturnItem } from "@/lib/orderRules";

export const RETURN_WINDOW_DAYS = 7;
export const EXCHANGE_WINDOW_DAYS = 7;

// The three things a retail buyer can ask for. They all live in one
// ReturnRequest record and one admin panel, because the first half of the
// journey — approve, collect the item, check it — is the same for all of them.
export const REQUEST_TYPES = ["return", "exchange", "refund"];

export const REQUEST_TYPE_LABELS = {
  return: "Return",
  exchange: "Exchange",
  refund: "Refund",
};

export const RETURN_REASONS = [
  "Damaged item",
  "Printing / quality issue",
  "Wrong item delivered",
  "Missing items",
  "Item not as described",
  "Other",
];

// An exchange is usually asked for because the wrong thing arrived, so it
// carries one reason a plain refund never does.
export const EXCHANGE_REASONS = [
  "Damaged item",
  "Printing / quality issue",
  "Wrong item delivered",
  "Wrong size / variant",
  "Item not as described",
  "Other",
];

export const reasonsForType = (type) =>
  type === "exchange" ? EXCHANGE_REASONS : RETURN_REASONS;

export const RETURN_STATUSES = [
  "Requested",
  "Approved",
  "Rejected",
  "Pickup Scheduled",
  "Item Received",
  "Refunded",
  "Replacement Shipped",
  "Replacement Delivered",
  "Closed",
];

// Statuses that still need someone to act on them. A replacement that is on
// its way out is still open — it is not done until the buyer has it.
export const OPEN_RETURN_STATUSES = [
  "Requested",
  "Approved",
  "Pickup Scheduled",
  "Item Received",
  "Replacement Shipped",
];

export const isB2CUser = (user) =>
  String(user?.userType || "customer").toLowerCase() === "customer";

export const daysSince = (date) =>
  date ? Math.floor((Date.now() - new Date(date).getTime()) / 86400000) : null;

// True when any item on the order cannot be exchanged. The flag is
// snapshotted onto the order item, so this holds even if the product is
// edited afterwards — the same way hasNoReturnItem works in orderRules.
// It is a separate switch in the admin product form:
// a product may be exchangeable but not refundable, or the other way round.
export const hasNoExchangeItem = (order) =>
  !!order?.items?.some((i) => i?.noExchange);

// What every type has to clear before the type's own rules are checked.
function commonProblem(order, user) {
  if (!order) return "Order not found";
  if (!isB2CUser(user)) return "This is available for retail orders only";
  if (order.status !== "Order Delivered")
    return "A request can be raised only after the order is delivered";
  return "";
}

function windowProblem(order, days, what) {
  const delivered = order.deliveredAt || order.updatedAt;
  const age = daysSince(delivered);
  if (age !== null && age > days)
    return `The ${days}-day ${what} window for this order has closed`;
  return "";
}

// Returns "" when the customer may raise a return/refund request, otherwise
// the reason why not.
export function checkReturnEligibility(order, user) {
  const common = commonProblem(order, user);
  if (common) return order && !isB2CUser(user)
    ? "Returns are available for retail orders only"
    : common;
  // Sold as final.
  if (hasNoReturnItem(order))
    return "This order has an item that is sold as final, so it cannot be returned or refunded";
  return windowProblem(order, RETURN_WINDOW_DAYS, "return");
}

// The same check for an exchange. A product marked "no exchange" blocks it,
// and so does the exchange window closing.
export function checkExchangeEligibility(order, user) {
  const common = commonProblem(order, user);
  if (common) return order && !isB2CUser(user)
    ? "Exchanges are available for retail orders only"
    : common;
  if (hasNoExchangeItem(order))
    return "This order has an item that cannot be exchanged";
  return windowProblem(order, EXCHANGE_WINDOW_DAYS, "exchange");
}

// One entry point for the API and the order page, so the browser hint and the
// server's answer can never disagree.
export function checkRequestEligibility(order, user, type) {
  return type === "exchange"
    ? checkExchangeEligibility(order, user)
    : checkReturnEligibility(order, user);
}

export const canRequestReturn = (order, user) => !checkReturnEligibility(order, user);
export const canRequestExchange = (order, user) => !checkExchangeEligibility(order, user);

// Badge colours shared by the admin list, the admin detail page and the
// customer's order page, so one status always looks the same everywhere.
export const RETURN_STATUS_STYLES = {
  Requested: { background: "#fef9c3", color: "#854d0e" },
  Approved: { background: "#dbeafe", color: "#1d4ed8" },
  Rejected: { background: "#fee2e2", color: "#b91c1c" },
  "Pickup Scheduled": { background: "#ede9fe", color: "#6d28d9" },
  "Item Received": { background: "#e0f2fe", color: "#0369a1" },
  Refunded: { background: "#dcfce7", color: "#15803d" },
  "Replacement Shipped": { background: "#ffedd5", color: "#c2410c" },
  "Replacement Delivered": { background: "#dcfce7", color: "#15803d" },
  Closed: { background: "#f1f5f9", color: "#475569" },
};

// What the admin may set next from a given status. Keeps the dropdown honest.
// The two flows share their first half and part ways after the item is back:
// money goes out on a return/refund, a replacement goes out on an exchange.
const NEXT_FOR_RETURN = {
  Requested: ["Approved", "Rejected"],
  Approved: ["Pickup Scheduled", "Rejected", "Closed"],
  "Pickup Scheduled": ["Item Received", "Closed"],
  "Item Received": ["Refunded", "Closed"],
  Refunded: ["Closed"],
  Rejected: ["Closed"],
  "Replacement Shipped": ["Closed"],
  "Replacement Delivered": ["Closed"],
  Closed: [],
};

const NEXT_FOR_EXCHANGE = {
  Requested: ["Approved", "Rejected"],
  Approved: ["Pickup Scheduled", "Rejected", "Closed"],
  "Pickup Scheduled": ["Item Received", "Closed"],
  "Item Received": ["Replacement Shipped", "Refunded", "Closed"],
  "Replacement Shipped": ["Replacement Delivered", "Closed"],
  "Replacement Delivered": ["Closed"],
  Refunded: ["Closed"],
  Rejected: ["Closed"],
  Closed: [],
};

// Kept for anything that still imports the old name — it is the return flow.
export const NEXT_RETURN_STATUSES = NEXT_FOR_RETURN;

export function nextStatusesFor(request) {
  const table = request?.type === "exchange" ? NEXT_FOR_EXCHANGE : NEXT_FOR_RETURN;
  return table[request?.status] || [];
}

// A replacement cannot be marked as shipped without something to track it by.
export const EXCHANGE_SHIPPED_STATUS = "Replacement Shipped";
export const EXCHANGE_DELIVERED_STATUS = "Replacement Delivered";
