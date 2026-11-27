// lib/flashPricing.js
// Flash sale rules shared by the browser and the server, so the product page,
// the cart and checkout always agree on what a deal costs.

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// live      → running now
// scheduled → enabled, starts later
// ended     → enabled, time is over
// off       → switched off by the admin
export function dealStatus(sale, now = Date.now()) {
  if (!sale) return "off";
  const t = typeof now === "number" ? now : new Date(now).getTime();
  const start = new Date(sale.startsAt).getTime();
  const end = new Date(sale.endsAt).getTime();
  if (!sale.enabled) return "off";
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "off";
  if (t < start) return "scheduled";
  if (t >= end) return "ended";
  return "live";
}

export const isDealLive = (sale, now) => dealStatus(sale, now) === "live";

// Flash sales are retail only. Partners never see them or get the price.
export const flashAppliesTo = (product, user) => {
  if (user?.userType === "partner") return false;
  const side = product?.productFor || "both";
  return side === "b2c" || side === "both";
};

// The normal price of one batch, before any deal
export const regularBatchPrice = (product) => {
  const sale = product?.salePrice != null ? toNumber(product.salePrice) : 0;
  return sale > 0 ? sale : toNumber(product?.basePrice);
};

// The price one product gets in one deal: its own override, else the deal price
export const itemDealPrice = (sale, item) => {
  const own = item?.price;
  if (own !== null && own !== undefined && own !== "" && toNumber(own, -1) >= 0) return toNumber(own);
  return toNumber(sale?.dealPrice);
};

// A copy of the product priced for the deal. The deal can only ever lower a
// price: one batch costs the deal price (or less, if the product is already
// cheaper), and every bulk slab is capped at the same per-unit rate so buying
// more never costs more per piece than buying the minimum.
export function applyFlashPrice(product, deal) {
  if (!product || !deal) return product;
  const price = toNumber(deal.price, NaN);
  if (!Number.isFinite(price) || price <= 0) return product;

  const min = toNumber(product.minOrderQty, 1) > 0 ? toNumber(product.minOrderQty, 1) : 1;
  const regular = regularBatchPrice(product);
  const batch = regular > 0 ? Math.min(price, regular) : price;
  const perUnit = batch / min;

  return {
    ...product,
    salePrice: round2(batch),
    pricingTiers: (product.pricingTiers || []).map((t) => {
      const qty = toNumber(t.minQty);
      const total = toNumber(t.pricePerUnit);
      const cap = round2(qty * perUnit);
      return { ...t, pricePerUnit: qty > 0 && total > 0 ? Math.min(total, cap) : total };
    }),
  };
}

// Whole seconds left, never negative
export const secondsLeft = (endsAt, now = Date.now()) =>
  Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));

export const splitDuration = (totalSeconds) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
};
