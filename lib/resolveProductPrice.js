// lib/resolveProductPrice.js
// Resolves a product's effective sale/base price, and any flat city surcharge
// to add on top of the computed order total for a given buyer city.

const normalizeCity = (city) => String(city || "").trim().toLowerCase();

// Sale price wins over base price when set — same convention used elsewhere
// in the app (ProductSlider, cart unit-price fallback).
export function getEffectivePrice(product) {
  const basePrice = Number(product?.basePrice || 0);
  const salePrice = product?.salePrice != null ? Number(product.salePrice) : undefined;
  return { basePrice, salePrice };
}

// City-wise pricing is an add-on, not a price replacement: if the buyer's
// city has a configured entry, that amount is added once to the order total
// (regardless of quantity) — e.g. a per-city delivery/handling surcharge.
export function getCityExtraCharge(product, city) {
  const target = normalizeCity(city);
  if (!target || !Array.isArray(product?.cityPrices) || product.cityPrices.length === 0) return 0;

  const override = product.cityPrices.find((cp) => normalizeCity(cp.city) === target);
  return override ? Number(override.price || 0) : 0;
}
