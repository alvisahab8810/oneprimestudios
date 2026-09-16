// lib/shippingQuote.js — works out what the courier will charge for a cart or an order.
// The customer is charged exactly what the courier quotes, so this runs on the server
// both while showing the checkout summary and again when the order is actually placed.
import { checkServiceability, isShiprocketConfigured } from "@/lib/shiprocket";
import { suggestPackage } from "@/lib/shipmentPayload";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * @param {object[]} items  [{ quantity, product: { shipping } }]
 * @param {string} deliveryPincode  6-digit destination pincode
 * @param {number} declaredValue    order value, used for insurance slabs
 * @returns {{available:boolean, reason?:string, charge:number, courierName?:string, etd?:string, weight:number}}
 */
export async function quoteShipping({ items, deliveryPincode, declaredValue = 0 }) {
  const pkg = suggestPackage({ items: items || [] });
  const base = { charge: 0, weight: pkg.weight };

  if (!isShiprocketConfigured() || !process.env.SHIPROCKET_PICKUP_PINCODE) {
    return { ...base, available: false, reason: "not_configured" };
  }
  if (!/^\d{6}$/.test(String(deliveryPincode || ""))) {
    return { ...base, available: false, reason: "invalid_pincode" };
  }
  if (!items?.length) {
    return { ...base, available: false, reason: "empty_cart" };
  }

  let data;
  try {
    data = await checkServiceability({
      pickupPincode: process.env.SHIPROCKET_PICKUP_PINCODE,
      deliveryPincode: String(deliveryPincode),
      weight: pkg.weight,
      declaredValue: Math.round(Number(declaredValue) || 0),
    });
  } catch (err) {
    console.error("Shipping quote error:", err?.message);
    return { ...base, available: false, reason: "quote_failed" };
  }

  const couriers = data?.data?.available_courier_companies || [];
  if (!couriers.length) {
    return { ...base, available: false, reason: "not_serviceable" };
  }

  // Cheapest courier decides the charge; the admin can still pick another one when booking
  const cheapest = couriers.reduce((best, c) => ((Number(c.rate) || 0) < (Number(best.rate) || 0) ? c : best));

  return {
    available: true,
    charge: round2(cheapest.rate),
    courierName: cheapest.courier_name || "",
    courierId: String(cheapest.courier_company_id || ""),
    etd: cheapest.etd || "",
    weight: pkg.weight,
  };
}

// Messages shown to the customer when no charge could be worked out
export const shippingQuoteMessage = (reason) => {
  switch (reason) {
    case "not_serviceable":
      return "Sorry, our courier partners do not deliver to this pincode yet. Please try a different address.";
    case "invalid_pincode":
      return "Please enter a valid 6-digit pincode to see delivery charges.";
    case "empty_cart":
      return "Your cart is empty.";
    default:
      return "Delivery charges could not be calculated right now. Please try again in a moment.";
  }
};
