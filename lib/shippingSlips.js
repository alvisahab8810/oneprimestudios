// lib/shippingSlips.js — shared rules for box slips (server and client safe).

// Orders that are packed or on their way. "ready" is the packing desk's queue.
export const SLIP_STAGES = {
  ready: ["Order Ready", "In Packaging"],
  dispatched: ["Order Dispatched", "Shipped"],
};
export const SLIP_STATUSES = [...SLIP_STAGES.ready, ...SLIP_STAGES.dispatched];

export const MAX_BOXES = 50;
export const MAX_NOTE = 120;
export const MAX_DIMENSIONS = 40;
export const MAX_PRINT_BATCH = 100;

// Cash the delivery person must collect, or 0 for a prepaid order
export function codToCollect(order) {
  if (!order) return 0;
  if (order.paymentMethod !== "COD") return 0;
  if (order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED") return 0;
  return Math.max(0, Math.round(Number(order.total || 0) * 100) / 100);
}

// "partner" → B2B, anything else → B2C
export function orderSide(order) {
  return order?.user?.userType === "partner" ? "B2B" : "B2C";
}

// "Colour: Red, Size: M" from the options picked on an order line.
// Uploaded files and empty values are left out.
export function describeAttrs(selectedAttrs) {
  if (!selectedAttrs || typeof selectedAttrs !== "object") return "";
  return Object.entries(selectedAttrs)
    .map(([name, value]) => {
      let text = "";
      if (Array.isArray(value)) text = value.filter((v) => typeof v === "string" || typeof v === "number").join(" / ");
      else if (typeof value === "string" || typeof value === "number") text = String(value);
      else if (value && typeof value === "object" && (value.value !== undefined || value.unit)) {
        text = [value.value, value.unit].filter((v) => v !== undefined && v !== "").join(" ");
      }
      text = text.trim();
      if (!text || /^(https?:)?\/\//.test(text) || text.startsWith("/uploads/")) return "";
      return `${name}: ${text}`;
    })
    .filter(Boolean)
    .join(", ");
}
