// lib/shiprocket.js — Shiprocket API client (server side only).
// Credentials come from the API user created in Shiprocket: Settings > API > Create an API User.
// Required env vars: SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, SHIPROCKET_PICKUP_LOCATION

const BASE_URL = "https://apiv2.shiprocket.in/v1/external";

// The login token is valid for 10 days; keep it in memory and refresh a day early.
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;
let cached = { token: "", expiresAt: 0 };

export const SHIPROCKET_PICKUP_LOCATION = process.env.SHIPROCKET_PICKUP_LOCATION || "";

export function isShiprocketConfigured() {
  return !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD && SHIPROCKET_PICKUP_LOCATION);
}

export class ShiprocketError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ShiprocketError";
    this.status = status || 500;
    this.details = details;
  }
}

// Shiprocket reports failures in several shapes; pull out something readable.
function readError(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data.message === "string" && data.message) return data.message;
  const errors = data.errors || data.error;
  if (typeof errors === "string") return errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors)[0];
    if (Array.isArray(first) && first.length) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return fallback;
}

async function login() {
  if (!process.env.SHIPROCKET_EMAIL || !process.env.SHIPROCKET_PASSWORD) {
    throw new ShiprocketError("Shiprocket is not configured on the server", 500);
  }
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.token) {
    throw new ShiprocketError(readError(data, "Shiprocket login failed"), res.status, data);
  }
  cached = { token: data.token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return cached.token;
}

export async function getToken(forceRefresh = false) {
  if (!forceRefresh && cached.token && cached.expiresAt > Date.now()) return cached.token;
  return login();
}

// One call to the Shiprocket API; retries once with a fresh token if the old one expired.
export async function shiprocketFetch(path, { method = "GET", body, query, retryOnAuthFail = true } = {}) {
  const token = await getToken();
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retryOnAuthFail) {
    cached = { token: "", expiresAt: 0 };
    return shiprocketFetch(path, { method, body, query, retryOnAuthFail: false });
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ShiprocketError(readError(data, "Shiprocket request failed"), res.status, data);
  }
  return data;
}

// ── Endpoints ──────────────────────────────────────────────────────────────

// Courier options and rates for a pincode pair
export function checkServiceability({ pickupPincode, deliveryPincode, weight, declaredValue, cod = 0 }) {
  return shiprocketFetch("/courier/serviceability/", {
    query: {
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight,
      cod,
      declared_value: declaredValue,
    },
  });
}

export function createShiprocketOrder(payload) {
  return shiprocketFetch("/orders/create/adhoc", { method: "POST", body: payload });
}

export function assignAwb({ shipmentId, courierId }) {
  return shiprocketFetch("/courier/assign/awb", {
    method: "POST",
    body: { shipment_id: shipmentId, ...(courierId ? { courier_id: courierId } : {}) },
  });
}

export function requestPickup({ shipmentId }) {
  return shiprocketFetch("/courier/generate/pickup", {
    method: "POST",
    body: { shipment_id: [shipmentId] },
  });
}

export function generateLabel({ shipmentId }) {
  return shiprocketFetch("/courier/generate/label", {
    method: "POST",
    body: { shipment_id: [shipmentId] },
  });
}

export function generateManifest({ shipmentId }) {
  return shiprocketFetch("/manifests/generate", {
    method: "POST",
    body: { shipment_id: [shipmentId] },
  });
}

export function trackByAwb(awb) {
  return shiprocketFetch(`/courier/track/awb/${encodeURIComponent(awb)}`);
}

export function cancelShipment({ awb }) {
  return shiprocketFetch("/orders/cancel/shipment/awbs", { method: "POST", body: { awbs: [awb] } });
}

export function cancelShiprocketOrder({ shiprocketOrderId }) {
  return shiprocketFetch("/orders/cancel", { method: "POST", body: { ids: [Number(shiprocketOrderId)] } });
}

export function listPickupLocations() {
  return shiprocketFetch("/settings/company/pickup");
}
