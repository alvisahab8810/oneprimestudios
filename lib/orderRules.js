// lib/orderRules.js — order rules shared by the customer pages and the API.
// No imports here, so it is safe to use on the client too.

// A customer may cancel only before production starts.
export const USER_CANCELLABLE_STATUSES = ["Order Received", "Design Rejected"];


// True when any item on the order was sold as final. The flag is snapshotted
// onto the item when the order is placed, so editing the product later never
// changes an order that is already running.
export function hasNoReturnItem(order) {
  return !!order?.items?.some((i) => i?.noReturns);
}

export function canUserCancelOrder(order) {
  if (!order) return false;
  if (hasNoReturnItem(order)) return false;
  if (!USER_CANCELLABLE_STATUSES.includes(order.status)) return false;
  // Once dispatch is requested or approved the order is on its way out.
  if (order.dispatchRequest === "pending" || order.dispatchRequest === "approved") return false;
  if (order.paymentStatus === "REFUNDED") return false;
  return true;
}

// Once an order has left the warehouse, the admin can no longer cancel it either.
export const ADMIN_NON_CANCELLABLE_STATUSES = ["Order Dispatched", "Order Delivered", "Shipped", "Delivered"];

export function canAdminCancelOrder(order) {
  if (!order) return false;
  return !ADMIN_NON_CANCELLABLE_STATUSES.includes(order.status);
}

// The status enum carries two spellings of the same final state, so every
// post-delivery feature (rate & review, returns prompts) checks both.
export const DELIVERED_STATUSES = ["Order Delivered", "Delivered"];

export function isDelivered(order) {
  return !!order && DELIVERED_STATUSES.includes(order.status);
}
