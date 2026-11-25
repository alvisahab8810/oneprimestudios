// lib/bogo.js — "Buy 1 Get 1 Free" and its bigger cousins, for retail only.
//
// The admin switches the offer on for a product and says how many have to be
// bought and how many then come free. The free units are always the same
// product, exactly as a retail site does it: the buyer puts two in the basket
// and pays for one, and the saving is shown as its own line.
//
// Partners never get it. Their prices are already wholesale, so every screen
// and the order route pass the buyer's type in and the offer is skipped for a
// partner.

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// The offer saved on a product, with the gaps filled in. buyQty below 1 or
// getQty below 1 would give away the shop, so both are held at 1 or more.
export function bogoRule(product) {
  const offer = product?.b2cOptions?.bogo || {};
  const enabled = !!offer.enabled && !!product?.b2cOptions?.enabled;
  const buyQty = Math.max(1, Math.floor(toNumber(offer.buyQty, 1)));
  const getQty = Math.max(1, Math.floor(toNumber(offer.getQty, 1)));
  return { enabled, buyQty, getQty };
}

// Whether this buyer can have the offer at all. A partner buys at B2B prices,
// so retail offers do not apply to them.
export function bogoApplies(product, { isPartner = false } = {}) {
  return !isPartner && bogoRule(product).enabled;
}

// "Buy 1 Get 1 Free" — the wording every screen shows, so the badge on the
// product card and the line in the cart can never say different things.
export function bogoLabel(product) {
  const { enabled, buyQty, getQty } = bogoRule(product);
  if (!enabled) return "";
  return `Buy ${buyQty} Get ${getQty} Free`;
}

// How many of these units are free at this quantity. A full set is buy + get:
// at Buy 1 Get 1, two units make one set and one of them is free.
export function bogoFreeQty(product, quantity, options = {}) {
  if (!bogoApplies(product, options)) return 0;

  const { buyQty, getQty } = bogoRule(product);
  const qty = Math.max(0, Math.floor(toNumber(quantity, 0)));
  const setSize = buyQty + getQty;

  const fullSets = Math.floor(qty / setSize);
  const remainder = qty - fullSets * setSize;

  // A part set still gives what has been earned in it: at Buy 2 Get 1, five
  // units are one full set plus two bought, so the fifth is not free yet.
  const earnedInRemainder = remainder > buyQty ? remainder - buyQty : 0;

  return fullSets * getQty + earnedInRemainder;
}

// The quantity this line is actually charged for.
export function bogoChargeableQty(product, quantity, options = {}) {
  const qty = Math.max(0, Math.floor(toNumber(quantity, 0)));
  return Math.max(0, qty - bogoFreeQty(product, qty, options));
}

// What the offer takes off this line, at the unit price the line was saved at.
export function bogoLineSaving(product, quantity, unitPrice, options = {}) {
  const free = bogoFreeQty(product, quantity, options);
  if (!free) return 0;
  return round2(free * toNumber(unitPrice, 0));
}

// How many more units would earn the next free one, or 0 when nothing is
// waiting. It is what the nudge on the product page and in the cart says.
export function bogoUnitsToNextFree(product, quantity, options = {}) {
  if (!bogoApplies(product, options)) return 0;

  const { buyQty, getQty } = bogoRule(product);
  const qty = Math.max(0, Math.floor(toNumber(quantity, 0)));
  const bought = qty % (buyQty + getQty);

  return bought >= buyQty ? 0 : buyQty - bought;
}

// The whole cart's saving. Lines are {product, quantity, price}: the shape the
// cart, the checkout and the order route all already hold.
export function cartBogoSaving(items, options = {}) {
  return round2(
    (items || []).reduce(
      (sum, item) =>
        sum + bogoLineSaving(item?.product, item?.quantity, item?.price, options),
      0
    )
  );
}
