// pages/api/admin/non-delivered.js
// Orders (partner and retail) sent through Shiprocket that did not reach the buyer.
// GET: the list, built from the courier statuses saved on orders plus Shiprocket's
//      live NDR (non-delivery report) list.
// POST: asks Shiprocket for the latest status of parcels still on the way, so new
//      failures show up even if a webhook was missed.
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import User from "@/models/User";
import Product from "@/models/Product";
import { requireAdminPermission } from "@/lib/adminAuth";
import { isShiprocketConfigured, listNdrShipments, ShiprocketError } from "@/lib/shiprocket";
import { NON_DELIVERY_PATTERN, isNonDeliveryStatus, issueGroup } from "@/lib/nonDelivery";
import { refreshTracking } from "@/pages/api/admin/shipments/track";

const NDR_MAX_PAGES = 5;
const REFRESH_LIMIT = 30;

const pick = (obj, keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
};

// Reads one NDR entry. Shiprocket has used a few field names over time.
function readNdr(row) {
  const history = Array.isArray(row?.history) ? row.history : Array.isArray(row?.ndr_history) ? row.ndr_history : [];
  const latest = history[0] || {};
  const products = Array.isArray(row?.products) ? row.products : [];
  return {
    awb: String(pick(row, ["awb_code", "awb", "shipment_awb"]) || pick(row?.shipments?.[0], ["awb", "awb_code"]) || "").trim(),
    reason: String(pick(row, ["reason", "ndr_reason", "escalation_reason"]) || pick(latest, ["reason", "comment", "remarks"]) || ""),
    attempts: Number(pick(row, ["attempts", "attempt_count", "ndr_attempt", "no_of_attempts"]) || history.length || 0),
    status: String(pick(row, ["status", "shipment_status", "current_status"]) || ""),
    raisedAt: pick(row, ["ndr_raised_at", "created_at", "raised_at"]) || pick(latest, ["created_at", "date"]) || "",
    courierName: String(pick(row, ["courier_name", "courier"]) || ""),
    channelOrderId: String(pick(row, ["channel_order_id", "order_id"]) || ""),
    customerName: String(pick(row, ["customer_name", "name"]) || ""),
    customerCity: String(pick(row, ["customer_city", "city"]) || ""),
    products: products.map((p) => ({ name: String(p?.name || p?.product_name || ""), quantity: Number(p?.quantity || p?.units || 1) })),
  };
}

async function fetchNdrList() {
  const byAwb = new Map();
  for (let page = 1; page <= NDR_MAX_PAGES; page++) {
    const data = await listNdrShipments({ page, perPage: 100 });
    const rows = Array.isArray(data?.data) ? data.data : [];
    for (const row of rows) {
      const n = readNdr(row);
      if (n.awb) byAwb.set(n.awb, n);
    }
    const totalPages = Number(data?.meta?.pagination?.total_pages) || 1;
    if (page >= totalPages || rows.length === 0) break;
  }
  return byAwb;
}

export default async function handler(req, res) {
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "orders");
  if (!admin) return;

  const configured = isShiprocketConfigured();

  if (req.method === "POST") {
    if (!configured) return res.status(503).json({ message: "Shiprocket is not set up yet" });

    // Parcels that are still on the way, least recently checked first
    const open = await Order.find({
      "shipment.awbCode": { $nin: ["", null] },
      "shipment.cancelledAt": null,
      status: { $nin: ["Order Delivered", "Delivered", "Cancelled", "Rejected"] },
      "shipment.status": { $not: new RegExp(NON_DELIVERY_PATTERN, "i") },
    })
      .sort({ "shipment.lastTrackedAt": 1 })
      .limit(REFRESH_LIMIT);

    let checked = 0;
    let failed = 0;
    let newIssues = 0;
    for (const order of open) {
      try {
        await refreshTracking(order);
        checked++;
        if (isNonDeliveryStatus(order.shipment?.status)) newIssues++;
      } catch (err) {
        failed++;
        if (!(err instanceof ShiprocketError)) console.error("Non-delivered refresh error:", err);
      }
    }

    const parts = [`Checked ${checked} parcel${checked === 1 ? "" : "s"}.`];
    if (newIssues) parts.push(`${newIssues} newly not delivered.`);
    if (failed) parts.push(`${failed} could not be checked.`);
    if (!open.length) parts[0] = "No parcels are on the way right now.";
    return res.status(200).json({ success: true, message: parts.join(" "), checked, failed, newIssues });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Live NDR list from Shiprocket. The page still works from saved statuses if this fails.
    let ndr = new Map();
    let shiprocket = { configured, ok: false, error: "" };
    if (configured) {
      try {
        ndr = await fetchNdrList();
        shiprocket.ok = true;
      } catch (err) {
        shiprocket.error = err?.message || "Could not reach Shiprocket";
      }
    }

    const ndrAwbs = [...ndr.keys()];
    const orders = await Order.find({
      "shipment.awbCode": { $nin: ["", null] },
      $or: [
        { "shipment.status": { $regex: NON_DELIVERY_PATTERN, $options: "i" } },
        ...(ndrAwbs.length ? [{ "shipment.awbCode": { $in: ndrAwbs } }] : []),
      ],
    })
      .select("orderNumber orderName user items shipping total paymentMethod status shipment createdAt updatedAt")
      .populate({ path: "user", model: User, select: "name email phone userType" })
      .populate({ path: "items.product", model: Product, select: "name images" })
      .sort({ "shipment.lastTrackedAt": -1, updatedAt: -1 })
      .lean();

    const matched = new Set();
    const rows = orders.map((o) => {
      const s = o.shipment || {};
      const n = ndr.get(s.awbCode);
      if (n) matched.add(s.awbCode);
      const status = s.status || n?.status || "Undelivered";
      const history = Array.isArray(s.trackingHistory) ? s.trackingHistory : [];
      const last = history[history.length - 1] || {};
      return {
        _id: o._id,
        orderNumber: o.orderNumber || "",
        orderName: o.orderName || "",
        type: o.user?.userType === "partner" ? "b2b" : "b2c",
        customer: {
          name: o.user?.name || o.shipping?.name || "",
          email: o.user?.email || "",
          phone: o.shipping?.phone || o.user?.phone || "",
          city: [o.shipping?.city, o.shipping?.state].filter(Boolean).join(", "),
          zip: o.shipping?.zip || "",
        },
        items: (o.items || []).map((it) => ({
          name: it.productName || it.product?.name || "Product",
          image: it.product?.images?.[0] || "",
          quantity: it.quantity,
          options: it.selectedAttrs && typeof it.selectedAttrs === "object" ? it.selectedAttrs : {},
        })),
        total: o.total,
        paymentMethod: o.paymentMethod,
        orderStatus: o.status,
        courier: {
          name: s.courierName || n?.courierName || "",
          awb: s.awbCode,
          trackingUrl: s.trackingUrl || "",
          status,
          group: issueGroup(status),
          lastUpdate: s.lastTrackedAt || last.date || o.updatedAt,
          lastActivity: last.activity || last.status || "",
          lastLocation: last.location || "",
        },
        ndr: n ? { reason: n.reason, attempts: n.attempts, raisedAt: n.raisedAt } : null,
        placedAt: o.createdAt,
      };
    });

    // Parcels in Shiprocket's NDR list that were not booked from this site
    const external = [...ndr.values()].filter((n) => !matched.has(n.awb));

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ success: true, rows, external, shiprocket });
  } catch (err) {
    console.error("Non-delivered list error:", err);
    return res.status(500).json({ message: "Could not load the not delivered orders" });
  }
}
