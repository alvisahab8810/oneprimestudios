// lib/rateList.js — the maths behind the partner rate list, in one place so the
// API that builds the table and the admin screen that configures the couriers
// can never disagree. No database imports here: the admin page uses it too.
// The price formula deliberately mirrors the product page: a pricing tier's
// pricePerUnit is the total for that tier's quantity, not a per-unit rate.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// A rate card stays readable, so a product with many attributes is cut off
// rather than printing thousands of lines
const MAX_COMBINATIONS = 40;
const MAX_ROWS_PER_PRODUCT = 200;

// Quantities the rate list prints for a product: its minimum order, every
// pricing tier, and the fixed B2B quantity options. Stock is deliberately
// ignored — a rate card quotes prices, it does not promise availability.
export const rateListQuantities = (product) => {
  const min = toNumber(product?.minOrderQty, 1);
  const safeMin = min > 0 ? min : 1;

  const tiers = (product?.pricingTiers || []).map((t) => toNumber(t.minQty));
  const fixed = (product?.b2bOptions?.quantityOptions || []).map((q) => toNumber(q));

  const all = [safeMin, ...tiers, ...fixed].filter((n) => Number.isFinite(n) && n > 0);
  return Array.from(new Set(all)).sort((a, b) => a - b);
};

// Price of the goods alone at this quantity, before any attribute is chosen.
// Each tier gives the total for its own quantity, so the rate is read off the
// first tier the quantity fits into and scaled — exactly as the product page does.
export const goodsPriceForQty = (product, qty) => {
  const min = toNumber(product?.minOrderQty, 1);
  const safeMin = min > 0 ? min : 1;

  const sale = product?.salePrice != null ? toNumber(product.salePrice) : null;
  const baseTotal = sale && sale > 0 ? sale : toNumber(product?.basePrice);

  const tiers = [
    { minQty: safeMin, totalPrice: baseTotal },
    ...(product?.pricingTiers || []).map((t) => ({
      minQty: toNumber(t.minQty),
      totalPrice: toNumber(t.pricePerUnit),
    })),
  ]
    .filter((t) => t.minQty > 0)
    .sort((a, b) => a.minQty - b.minQty);

  if (!tiers.length) return 0;

  const matched = tiers.find((t) => qty <= t.minQty) || tiers[tiers.length - 1];
  return round2(qty * (matched.totalPrice / matched.minQty));
};

// What one attribute option adds per batch at this quantity. An option may
// price itself differently in bulk, so its own tiers win where they apply.
const optionExtra = (option, qty) => {
  const tiers = (option?.pricingTiers || [])
    .map((t) => ({ minQty: toNumber(t.minQty), priceModifier: toNumber(t.priceModifier) }))
    .filter((t) => t.minQty > 0 && t.minQty <= qty)
    .sort((a, b) => b.minQty - a.minQty);

  return tiers.length ? tiers[0].priceModifier : toNumber(option?.priceModifier);
};

// Every combination of the product's choices, which is what the DETAIL column
// of a rate card lists: one printed line per combination, like the trade price
// lists partners are used to. Only select attributes take part — checkboxes are
// add-ons the partner picks at order time, and uploads carry no price.
export const attributeCombinations = (product) => {
  const selects = (product?.attributes || []).filter(
    (attr) => attr?.type === "select" && Array.isArray(attr.values) && attr.values.length
  );
  if (!selects.length) return [];

  let combos = [[]];
  for (const attr of selects) {
    const next = [];
    for (const combo of combos) {
      for (const value of attr.values) {
        next.push([...combo, { name: attr.name, label: value.label, option: value }]);
        if (next.length >= MAX_COMBINATIONS) break;
      }
      if (next.length >= MAX_COMBINATIONS) break;
    }
    combos = next;
    if (combos.length >= MAX_COMBINATIONS) break;
  }

  return combos;
};

// What the chosen courier charges to carry this much weight. Part-kilograms are
// billed as a full kilogram, which is how courier slabs actually work.
export const courierCharge = (courier, weightKg) => {
  if (!courier) return 0;
  const weight = toNumber(weightKg);
  const slabs = weight > 0 ? Math.ceil(weight) : 0;
  return round2(toNumber(courier.baseCharge) + toNumber(courier.perKg) * slabs);
};

// One printed line of the rate list: a quantity, one combination of choices,
// and what the partner pays for it.
export const buildRateRow = (product, qty, courier, combination = []) => {
  const min = toNumber(product?.minOrderQty, 1);
  const safeMin = min > 0 ? min : 1;
  const batches = qty / safeMin;

  const extraPerBatch = combination.reduce((sum, part) => sum + optionExtra(part.option, qty), 0);
  const goods = round2(goodsPriceForQty(product, qty) + extraPerBatch * batches);

  const gstPercent = toNumber(product?.gstPercent);
  const gst = round2((goods * gstPercent) / 100);
  const weight = round2(toNumber(product?.shipping?.weight) * qty);
  const delivery = courierCharge(courier, weight);

  return {
    quantity: qty,
    // The choices this price is for, so the page can print them as the card does
    detailParts: combination.map((part) => ({ name: part.name, value: part.label })),
    goods,
    gstPercent,
    gst,
    weight,
    delivery,
    // What the partner pays: goods + GST + the courier's charge
    total: round2(goods + gst + delivery),
  };
};

// Every line a product contributes to the rate card: each quantity priced for
// each combination of choices.
export const buildRateRows = (product, courier) => {
  const quantities = rateListQuantities(product);
  const combos = attributeCombinations(product);
  const rows = [];

  for (const qty of quantities) {
    if (!combos.length) {
      rows.push(buildRateRow(product, qty, courier));
    } else {
      for (const combo of combos) {
        rows.push(buildRateRow(product, qty, courier, combo));
        if (rows.length >= MAX_ROWS_PER_PRODUCT) return rows;
      }
    }
    if (rows.length >= MAX_ROWS_PER_PRODUCT) break;
  }

  return rows;
};

// Validates what the admin courier form sends. Returns { data } or { error }.
export const parseCourierBody = (body) => {
  const name = String(body?.name || "").trim();
  if (!name) return { error: "Courier name is required" };

  const baseCharge = Number(body?.baseCharge);
  const perKg = Number(body?.perKg);
  if (!Number.isFinite(baseCharge) || baseCharge < 0) {
    return { error: "Enter a base charge of 0 or more" };
  }
  if (!Number.isFinite(perKg) || perKg < 0) {
    return { error: "Enter a per-kg charge of 0 or more" };
  }

  return {
    data: {
      name,
      baseCharge: round2(baseCharge),
      perKg: round2(perKg),
      order: toNumber(body?.order),
      isActive: body?.isActive !== false && body?.isActive !== "false",
    },
  };
};
