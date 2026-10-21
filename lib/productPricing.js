// lib/productPricing.js
// Every quantity-based price in the app is worked out here, so the product
// page, the cart and the partner rate list can never quote different amounts.
//
// How the admin forms store a price:
//  - basePrice / salePrice is the total for one batch of minOrderQty units.
//  - a pricing tier's pricePerUnit is the total for that tier's own minQty.
//  - an attribute option's priceModifier is charged once per batch; the
//    option's own tiers replace that amount from their minQty upwards.
//  - a city price is a flat surcharge added once, whatever the quantity.

import { getCityExtraCharge } from "@/lib/resolveProductPrice";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// One batch is the minimum order quantity: the unit the base price and every
// attribute charge are quoted against.
export const batchSize = (product) => {
  const min = toNumber(product?.minOrderQty, 1);
  return min > 0 ? min : 1;
};

// The quantity a buyer is actually charged for; below the minimum order
// quantity the minimum applies.
export const chargeableQty = (product, quantity) => {
  const min = batchSize(product);
  const qty = toNumber(quantity, min);
  return qty < min ? min : qty;
};

// Price of the goods alone, before any choice is made. A quantity qualifies for
// the highest slab it reaches — never a bigger slab it has not reached, which
// would hand out a bulk rate early and could make a larger order cost less.
export const goodsTotal = (product, quantity) => {
  const min = batchSize(product);
  const sale = product?.salePrice != null ? toNumber(product.salePrice) : 0;
  const baseTotal = sale > 0 ? sale : toNumber(product?.basePrice);

  const slabs = [
    { minQty: min, totalPrice: baseTotal },
    ...(product?.pricingTiers || []).map((t) => ({
      minQty: toNumber(t.minQty),
      totalPrice: toNumber(t.pricePerUnit),
    })),
  ]
    .filter((t) => t.minQty > 0)
    .sort((a, b) => a.minQty - b.minQty);

  if (!slabs.length) return 0;

  const qty = toNumber(quantity, min);
  let matched = slabs[0];
  for (const slab of slabs) {
    if (qty >= slab.minQty) matched = slab;
  }

  return round2(qty * (matched.totalPrice / matched.minQty));
};

// What one attribute option adds per batch at this quantity. An option may be
// priced differently in bulk, so its own tiers win wherever they apply.
export const optionExtraPerBatch = (option, quantity) => {
  const qty = toNumber(quantity);
  const tiers = (option?.pricingTiers || [])
    .map((t) => ({ minQty: toNumber(t.minQty), priceModifier: toNumber(t.priceModifier) }))
    .filter((t) => t.minQty > 0 && t.minQty <= qty)
    .sort((a, b) => b.minQty - a.minQty);

  return tiers.length ? tiers[0].priceModifier : toNumber(option?.priceModifier);
};

// Everything the buyer's choices add per batch. Text and upload choices carry
// no price; a number choice is charged at the number typed.
export const attributesExtraPerBatch = (product, selectedAttrs, quantity) => {
  let extra = 0;

  (product?.attributes || []).forEach((attr) => {
    const chosen = selectedAttrs?.[attr?.name];
    if (chosen === undefined || chosen === null || chosen === "") return;

    if (attr.type === "select") {
      const option = (attr.values || []).find((v) => v.label === chosen);
      if (option) extra += optionExtraPerBatch(option, quantity);
      return;
    }

    if (attr.type === "checkbox") {
      (Array.isArray(chosen) ? chosen : []).forEach((label) => {
        const option = (attr.values || []).find((v) => v.label === label);
        if (option) extra += optionExtraPerBatch(option, quantity);
      });
      return;
    }

    if (attr.type === "number") {
      const typed = Number(chosen);
      if (Number.isFinite(typed)) extra += typed;
    }
  });

  return extra;
};

// The one price every screen quotes: goods at this quantity, the chosen
// attributes for every batch, and the buyer's city surcharge once.
export const priceForQuantity = (product, quantity, options = {}) => {
  const { selectedAttrs = {}, city = "" } = options;

  const min = batchSize(product);
  const qty = chargeableQty(product, quantity);
  const batches = qty / min;

  const goods = goodsTotal(product, qty);
  const attributes = round2(attributesExtraPerBatch(product, selectedAttrs, qty) * batches);
  const cityCharge = round2(getCityExtraCharge(product, city));
  const total = round2(goods + attributes + cityCharge);

  return {
    quantity: qty,
    batches,
    goods,
    attributes,
    cityCharge,
    total,
    // What the cart stores, so a line's subtotal is unit price times quantity
    unitPrice: qty > 0 ? total / qty : total,
  };
};
