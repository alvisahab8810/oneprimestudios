// lib/deliveryZones.js — one place for the "can this product be delivered to
// this PIN code?" rule, so the product page, the cart and the order API all
// agree. Same shape as lib/stockRules.js: a check returns an error message, or
// "" when the order is fine.
//
// How the admin configures it on a product:
//  - "all"       : deliverable everywhere (the default for every product).
//  - "allowlist" : deliverable only at the PIN codes listed.
//  - "blocklist" : deliverable everywhere except the PIN codes listed.
// A list entry is a full 6-digit PIN code (226025) or the leading part of one
// (226 covers 226xxx), which is how a courier's serviceable area is usually
// written down.

export const DELIVERY_ZONE_MODES = ["all", "allowlist", "blocklist"];

// Only the digits matter: a buyer may type "226 025" or " 226025".
export const normalizePincode = (value) =>
  String(value ?? "").replace(/\D/g, "").slice(0, 6);

export const isValidPincode = (value) => /^\d{6}$/.test(normalizePincode(value));

// Turns the admin's textarea (or a stored array) into a clean, de-duplicated
// list. Entries may be separated by commas, spaces or new lines.
export const parsePincodeList = (value) => {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(/[\s,;]+/);
  const seen = new Set();
  raw.forEach((entry) => {
    const pin = normalizePincode(entry);
    if (pin) seen.add(pin);
  });
  return Array.from(seen).sort();
};

// The product's rule, with anything missing or unusable read as "deliver
// everywhere". A list-based rule with an empty list is treated as unset: an
// empty allowlist would block every buyer, which is never what was meant.
export const getDeliveryZones = (product) => {
  const zones = product?.deliveryZones || {};
  const mode = DELIVERY_ZONE_MODES.includes(zones.mode) ? zones.mode : "all";
  const pincodes = parsePincodeList(zones.pincodes);
  const message = String(zones.message || "").trim();
  if (mode === "all" || !pincodes.length) return { mode: "all", pincodes: [], message };
  return { mode, pincodes, message };
};

// Normalises what the admin product form sends (a JSON string in the multipart
// body) into exactly what the Product schema stores.
export const parseDeliveryZones = (value) => {
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  const mode = DELIVERY_ZONE_MODES.includes(raw?.mode) ? raw.mode : "all";
  const pincodes = parsePincodeList(raw?.pincodes);
  const message = String(raw?.message || "").trim().slice(0, 300);
  if (mode === "all" || !pincodes.length) return { mode: "all", pincodes: [], message };
  return { mode, pincodes, message };
};

// True for a product the admin has limited to certain PIN codes.
export const hasDeliveryZones = (product) => getDeliveryZones(product).mode !== "all";

export const matchesList = (pincodes, pincode) =>
  pincodes.some((entry) => pincode === entry || (entry.length < 6 && pincode.startsWith(entry)));

// True when the product can be delivered to this PIN code. An unrestricted
// product is deliverable everywhere, and so is a PIN code we do not have yet —
// the caller decides whether to ask for one (see deliveryStatus).
export const isPincodeServiceable = (product, pincode) => {
  const { mode, pincodes } = getDeliveryZones(product);
  if (mode === "all") return true;
  const pin = normalizePincode(pincode);
  if (!isValidPincode(pin)) return true;
  const listed = matchesList(pincodes, pin);
  return mode === "allowlist" ? listed : !listed;
};

// What the storefront says on a product it cannot deliver. The admin's own
// wording wins wherever they set one.
export const deliveryUnavailableMessage = (product, pincode) => {
  const { message } = getDeliveryZones(product);
  if (message) return message;
  const pin = normalizePincode(pincode);
  return pin
    ? `This product is not available for delivery at PIN code ${pin}.`
    : "This product is not available for delivery at your PIN code.";
};

// Returns an error message when this product cannot be delivered to this PIN
// code, or "" when it is fine.
export const checkDeliverable = (product, pincode) =>
  isPincodeServiceable(product, pincode) ? "" : deliveryUnavailableMessage(product, pincode);

// Everything the product page's delivery check needs, in one call.
export const deliveryStatus = (product, pincode) => {
  const restricted = hasDeliveryZones(product);
  const pin = normalizePincode(pincode);
  const checked = isValidPincode(pin);
  const serviceable = !restricted || !checked || isPincodeServiceable(product, pin);
  return {
    restricted,
    pincode: pin,
    // Whether a usable PIN code was supplied at all
    checked,
    serviceable,
    message: serviceable ? "" : deliveryUnavailableMessage(product, pin),
  };
};

// ── Free delivery ──────────────────────────────────────────────────────────
// A product can be delivered free either everywhere or only at certain PIN
// codes. The list is read the same way as a delivery zone: a full 6-digit code
// or the leading part of one.

export const freeDeliveryScope = (product) => {
  const enabled = !!product?.freeDelivery;
  const pincodes = parsePincodeList(product?.freeDeliveryPincodes);
  return { enabled, everywhere: enabled && !pincodes.length, pincodes };
};

// True when this product ships free to this PIN code. Without a usable PIN
// code a PIN-limited product is not treated as free — the buyer is never
// promised a free delivery that the pincode may not qualify for.
export const isFreeDeliveryAt = (product, pincode) => {
  const { enabled, everywhere, pincodes } = freeDeliveryScope(product);
  if (!enabled) return false;
  if (everywhere) return true;
  const pin = normalizePincode(pincode);
  if (!isValidPincode(pin)) return false;
  return matchesList(pincodes, pin);
};

// What the product page says about free delivery, or "" when there is none
export const freeDeliveryNote = (product) => {
  const { enabled, everywhere, pincodes } = freeDeliveryScope(product);
  if (!enabled) return "";
  if (everywhere) return "Free Delivery";
  const shown = pincodes.slice(0, 6).join(", ");
  const more = pincodes.length > 6 ? ` +${pincodes.length - 6} more` : "";
  return `Free delivery at PIN codes ${shown}${more}`;
};
