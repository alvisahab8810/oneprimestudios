// lib/courierRates.js — the couriers offered on the partner rate list, taken
// from the live Shiprocket account the rest of the app already books with.
//
// A rate card prices dozens of rows, and asking Shiprocket for every row's
// weight would mean dozens of calls per page. Instead each courier is quoted at
// two weights and its slab is read off those two points: that is two calls for
// the whole card, and the same base + per-kg shape the rest of the rate list
// maths already works in.
import { checkServiceability, isShiprocketConfigured } from "@/lib/shiprocket";

// The two weights the slab is read from
const LIGHT_KG = 1;
const HEAVY_KG = 5;

// Live rates are stable over a session, and a partner flicking between product
// groups must not fire a pair of Shiprocket calls each time.
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Ids are prefixed so a live courier is never confused with one the admin saved
export const LIVE_PREFIX = "sr:";
export const isLiveCourierId = (id) => String(id || "").startsWith(LIVE_PREFIX);

const rateMap = (data) => {
  const list = data?.data?.available_courier_companies || [];
  const map = new Map();
  for (const c of list) {
    const id = String(c.courier_company_id || "");
    if (!id) continue;
    map.set(id, {
      id,
      name: c.courier_name || "Courier",
      rate: Number(c.rate) || 0,
      etd: c.etd || "",
    });
  }
  return map;
};

async function quoteCouriers(deliveryPincode) {
  const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE;
  if (!isShiprocketConfigured() || !pickupPincode) return [];
  if (!/^\d{6}$/.test(String(deliveryPincode || ""))) return [];

  const ask = (weight) =>
    checkServiceability({
      pickupPincode,
      deliveryPincode: String(deliveryPincode),
      weight,
      declaredValue: 1000,
    });

  const [light, heavy] = await Promise.all([ask(LIGHT_KG), ask(HEAVY_KG)]);
  const lightRates = rateMap(light);
  const heavyRates = rateMap(heavy);

  const couriers = [];
  for (const [id, lightQuote] of lightRates) {
    const heavyQuote = heavyRates.get(id);

    // Without a second quote the courier is priced flat rather than dropped —
    // a partner would rather see it than lose the option
    const perKg = heavyQuote
      ? Math.max(0, round2((heavyQuote.rate - lightQuote.rate) / (HEAVY_KG - LIGHT_KG)))
      : 0;
    const baseCharge = Math.max(0, round2(lightQuote.rate - perKg * LIGHT_KG));

    couriers.push({
      _id: `${LIVE_PREFIX}${id}`,
      name: lightQuote.name,
      baseCharge,
      perKg,
      etd: lightQuote.etd,
    });
  }

  couriers.sort((a, b) => a.baseCharge - b.baseCharge || a.name.localeCompare(b.name));
  return couriers;
}

// Live couriers for a delivery pincode, or an empty list when Shiprocket cannot
// answer. Never throws: the rate list falls back to the saved couriers instead.
export async function getLiveCouriers(deliveryPincode) {
  const key = String(deliveryPincode || "");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.couriers;

  let couriers = [];
  try {
    couriers = await quoteCouriers(key);
  } catch (err) {
    console.error("Live courier rates error:", err?.message);
    return [];
  }

  cache.set(key, { at: Date.now(), couriers });
  return couriers;
}

// The one the partner picked, looked up in the same cached list the dropdown
// was built from.
export async function findLiveCourier(courierId, deliveryPincode) {
  const couriers = await getLiveCouriers(deliveryPincode);
  return couriers.find((c) => c._id === courierId) || null;
}
