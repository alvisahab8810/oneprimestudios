// lib/ewayBill.js — shared e-way bill rules (used by both the API and admin pages).
// No imports here, so it is safe to use on the client too.

// CGST Rule 138: e-way bill is mandatory when consignment value exceeds ₹50,000.
export const EWAY_THRESHOLD = 50000;

export const SELLER = {
  name:    "One Prime Studios",
  gstin:   "09CORPG5317P1Z6",
  street:  "591/eya/19 kumhar mandi, Kharika telibagh",
  city:    "Lucknow",
  state:   "Uttar Pradesh",
  pincode: "226029", // Telibagh, Lucknow — please confirm
};

// GST Unit Quantity Codes (UQC) accepted by the e-way bill portal.
export const UQC = [
  "NOS", "PCS", "SQF", "SQM", "SQY", "MTR", "CMS", "KGS", "GMS", "TON", "QTL", "LTR", "MLT",
  "BOX", "CTN", "PAC", "BAG", "BDL", "BUN", "ROL", "SET", "PRS", "DOZ", "UNT", "BTL", "CAN",
  "DRM", "TUB", "TBS", "CBM", "CCM", "KLR", "KME", "YDS", "GYD", "GRS", "GGK", "BKL", "BAL",
  "BOU", "TGM", "THD", "UGS", "OTH",
];

// ── Dates in IST, printed the way the NIC portal prints them ──────────────────
const IST_MS = 330 * 60 * 1000;
const pad = (n) => String(n).padStart(2, "0");
const ist = (d) => new Date(new Date(d).getTime() + IST_MS); // read with getUTC* = IST wall clock

export function ewbDate(d) {
  if (!d) return "-";
  const x = ist(d);
  return `${pad(x.getUTCDate())}/${pad(x.getUTCMonth() + 1)}/${x.getUTCFullYear()}`;
}

export function ewbDateTime(d, withSeconds = false) {
  if (!d) return "-";
  const x = ist(d);
  const h = x.getUTCHours();
  const time = `${pad(h % 12 || 12)}:${pad(x.getUTCMinutes())}${withSeconds ? `:${pad(x.getUTCSeconds())}` : ""} ${h < 12 ? "AM" : "PM"}`;
  return `${ewbDate(d)} ${time}`;
}

export const ewbNumberFmt = (n) => (n ? String(n).replace(/(\d{4})(?=\d)/g, "$1 ") : "");

// Rule 138(10): Regular vehicle — 1 day per 200 km (or part thereof).
// ODC — 1 day per 20 km. Each day ends at midnight (IST).
export function validityDays(distanceKm, vehicleType = "Regular") {
  const per = vehicleType === "ODC" ? 20 : 200;
  return Math.max(1, Math.ceil(Number(distanceKm || 0) / per));
}

export function computeValidUpto(generatedAt, distanceKm, vehicleType) {
  if (!generatedAt) return null;
  const x = ist(generatedAt);
  x.setUTCDate(x.getUTCDate() + validityDays(distanceKm, vehicleType));
  x.setUTCHours(23, 59, 59, 0);
  return new Date(x.getTime() - IST_MS);
}

// Portal format "C+S+I+Cess+Cess Non.Advol", e.g. "9.000+9.000+NE+NE+0.00" (NE = not entered).
export function taxRateLabel(gstType, percent) {
  const p = Number(percent || 0);
  if (gstType === "INTER") return `NE+NE+${p.toFixed(3)}+NE+0.00`;
  if (gstType === "INTRA" && p > 0) return `${(p / 2).toFixed(3)}+${(p / 2).toFixed(3)}+NE+NE+0.00`;
  return "NE+NE+NE+NE+0.00";
}

// Goods lines come from the invoice. Only HSN, quantity and unit can be adjusted on the e-way bill.
export function goodsFromInvoice(inv, saved = []) {
  return (inv.items || []).map((it, i) => {
    const s = saved[i] || {};
    return {
      hsnCode:       String(s.hsnCode ?? it.hsnCode ?? "").trim(),
      description:   it.description || "",
      qty:           Number(s.qty ?? it.qty ?? 0),
      unit:          UQC.includes(s.unit) ? s.unit : "NOS",
      taxableAmount: Number(it.taxableAmount ?? (it.qty || 0) * (it.rate || 0)),
      gstPercent:    Number(it.gstPercent || inv.gstPercent || 0),
    };
  });
}

export function billToFromInvoice(inv) {
  const p = inv.partnerAddress || {};
  return {
    gstin: (p.gst || "").toUpperCase(),
    name:  p.companyName || p.name || inv.partnerName || "",
    state: p.state || "",
  };
}

// New draft — Part A prefilled from the invoice.
export function draftFromInvoice(inv) {
  const bill = inv.partnerAddress || {};
  const ship = inv.shipToAddress?.street || inv.shipToAddress?.city ? inv.shipToAddress : bill;
  const billDiffersFromShip = inv.shipToAddress?.street && inv.shipToAddress.street !== bill.street;

  return {
    invoiceId: inv._id,
    invoiceNumber: inv.invoiceNumber,
    transactionType: billDiffersFromShip ? "Bill To-Ship To" : "Regular",
    billTo: billToFromInvoice(inv),
    dispatchFrom: { street: SELLER.street, city: SELLER.city, state: SELLER.state, pincode: SELLER.pincode },
    shipTo: { street: ship.street || "", city: ship.city || "", state: ship.state || "", pincode: ship.zip || "" },
    goods: goodsFromInvoice(inv),
    status: "DRAFT",
  };
}

// Fills parts missing from bills saved before Bill To / Goods existed.
export function withInvoiceDefaults(b, inv) {
  return {
    ...b,
    billTo: b.billTo?.name ? b.billTo : billToFromInvoice(inv),
    goods: goodsFromInvoice(inv, b.goods || []),
  };
}

// Browser only: builds a fresh PDF on the server and downloads it (never a stale cached file).
export async function downloadEwayBillPdf(invoiceId) {
  const res = await fetch("/api/admin/eway-bills/generate-pdf", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoiceId, download: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to download PDF");
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || "e-way-bill.pdf";
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return `/eway-bills/${name}`;
}

// Fields required before a bill can be marked "GENERATED"
export function missingForGenerate(b) {
  const miss = [];
  if (!/^\d{12}$/.test(String(b.ewbNumber || "").replace(/\s/g, ""))) miss.push("E-Way Bill No. (12 digits)");
  if (!b.billTo?.name) miss.push("Bill To name");
  if (b.billTo?.gstin && b.billTo.gstin !== "URP" && !/^[0-9A-Z]{15}$/.test(b.billTo.gstin)) miss.push("Bill To GSTIN (15 characters or URP)");
  if (!/^\d{6}$/.test(String(b.dispatchFrom?.pincode || ""))) miss.push("Dispatch From PIN code (6 digits)");
  if (!/^\d{6}$/.test(String(b.shipTo?.pincode || ""))) miss.push("Ship To PIN code (6 digits)");
  if ((b.goods || []).some((g) => !/^\d{4,8}$/.test(String(g.hsnCode || "")))) miss.push("HSN code for every goods line (4–8 digits)");
  if (!(Number(b.distanceKm) > 0)) miss.push("Approx distance (km)");
  if (b.transporterId && !/^[0-9A-Z]{15}$/.test(b.transporterId)) miss.push("Transporter ID (15 characters)");
  if (b.transportMode === "Road" && !b.vehicleNumber && !b.transporterId) miss.push("Vehicle No. or Transporter ID");
  if (b.transportMode !== "Road" && !b.transportDocNo) miss.push("Transport Doc No.");
  return miss;
}
