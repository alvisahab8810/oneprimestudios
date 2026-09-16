// lib/shipmentPayload.js — turns an Order document into the payload Shiprocket expects,
// and maps courier statuses back to our own order statuses.

// Fallbacks used when a product has no package details saved
export const DEFAULT_PACKAGE = { weight: 0.5, length: 20, breadth: 15, height: 5 };

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Package size suggested from the products in the order.
// Weight adds up per unit; the box is as wide/long as the biggest item and as tall as the stack.
export function suggestPackage(order) {
  let weight = 0;
  let length = 0;
  let breadth = 0;
  let height = 0;

  (order?.items || []).forEach((item) => {
    const qty = Number(item.quantity) || 1;
    const ship = item.product?.shipping || {};
    weight += (Number(ship.weight) || 0) * qty;
    length = Math.max(length, Number(ship.length) || 0);
    breadth = Math.max(breadth, Number(ship.breadth) || 0);
    height += (Number(ship.height) || 0) * qty;
  });

  return {
    weight: round2(weight) || DEFAULT_PACKAGE.weight,
    length: round2(length) || DEFAULT_PACKAGE.length,
    breadth: round2(breadth) || DEFAULT_PACKAGE.breadth,
    height: round2(height) || DEFAULT_PACKAGE.height,
    // True when every product carried its own weight, so the admin knows whether to check it
    fromProducts: weight > 0,
  };
}

// Shiprocket needs the address in two parts; we only store one, so shipping = billing.
export function buildOrderPayload({ order, pickupLocation, pkg, resellerName }) {
  const shipping = order.shipping || {};
  const buyer = order.user || {};
  const [firstName, ...restName] = String(shipping.name || buyer.name || "Customer").trim().split(/\s+/);

  const items = (order.items || []).map((item) => ({
    name: String(item.productName || item.product?.name || "Print order").slice(0, 100),
    sku: String(item.product?.sku || item.product?._id || "ITEM"),
    units: Number(item.quantity) || 1,
    selling_price: round2(item.price),
    hsn: item.product?.hsnCode || "",
  }));

  const discount = Number(order.coupon?.discountAmount) || 0;

  return {
    order_id: String(order.orderNumber || order._id),
    order_date: new Date(order.createdAt || Date.now()).toISOString().slice(0, 19).replace("T", " "),
    pickup_location: pickupLocation,
    channel_id: "",
    comment: order.orderName || "",
    reseller_name: resellerName || "",
    billing_customer_name: firstName || "Customer",
    billing_last_name: restName.join(" "),
    billing_address: shipping.street || "",
    billing_city: shipping.city || "",
    billing_pincode: String(shipping.zip || ""),
    billing_state: shipping.state || "",
    billing_country: "India",
    billing_email: buyer.email || "",
    billing_phone: String(shipping.phone || buyer.phone || "").replace(/\D/g, "").slice(-10),
    shipping_is_billing: true,
    order_items: items,
    // The site takes payment online before dispatch, so every shipment is prepaid
    payment_method: "Prepaid",
    sub_total: round2(order.total),
    length: Number(pkg.length),
    breadth: Number(pkg.breadth),
    height: Number(pkg.height),
    weight: Number(pkg.weight),
  };
}

// Everything the shipment needs before it can be booked
export function validateShipmentReadiness(order, pkg) {
  const problems = [];
  const shipping = order?.shipping || {};
  if (!shipping.street) problems.push("shipping address");
  if (!shipping.city) problems.push("city");
  if (!shipping.state) problems.push("state");
  if (!/^\d{6}$/.test(String(shipping.zip || ""))) problems.push("a valid 6-digit pincode");
  if (String(shipping.phone || order?.user?.phone || "").replace(/\D/g, "").length < 10) problems.push("a 10-digit phone number");
  if (!order?.user?.email) problems.push("an email address");
  if (!(Number(pkg?.weight) > 0)) problems.push("package weight");
  if (!(Number(pkg?.length) > 0 && Number(pkg?.breadth) > 0 && Number(pkg?.height) > 0)) problems.push("package dimensions");
  return problems;
}

// Shiprocket status text -> our order status. Anything unknown leaves the order as it is.
export function mapCourierStatusToOrderStatus(courierStatus) {
  const s = String(courierStatus || "").toLowerCase();
  if (!s) return "";
  if (s.includes("delivered")) return "Order Delivered";
  if (s.includes("canceled") || s.includes("cancelled")) return "";
  if (
    s.includes("shipped") ||
    s.includes("in transit") ||
    s.includes("out for delivery") ||
    s.includes("picked up") ||
    s.includes("pickup complete") ||
    s.includes("dispatched")
  ) {
    return "Order Dispatched";
  }
  return "";
}
