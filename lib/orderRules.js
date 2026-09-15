// lib/orderRules.js — order rules shared by the customer pages and the API.
// No imports here, so it is safe to use on the client too.

// A customer may cancel only before production starts.
export const USER_CANCELLABLE_STATUSES = ["Order Received", "Design Rejected"];

export function canUserCancelOrder(order) {
  if (!order) return false;
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
