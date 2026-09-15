// pages/api/admin/reports/product-sales.js
// GET — product-wise sales report built from order line items.
//
// Query params (all optional):
//   from, to        YYYY-MM-DD (IST calendar days, inclusive)
//   groupBy         month | week | day            (default month)
//   status          valid | delivered | in_progress | cancelled | all   (default valid)
//   userType        partner | customer
//   category        Category id (includes its sub-categories)
//   product         Product id
//   paymentMethod   Wallet | Razorpay             (needs payment permission)
//   paymentStatus   PAID | UNPAID | REFUNDED      (needs payment permission)
//   state           shipping state (exact, case-insensitive)
//   search          order no, order name, customer name / company / email / phone
//
// Money per line: gross = qty × price (before discount and GST).
// The order's discount, GST and grand total are shared across its lines in proportion
// to each line's gross, so line "net" values add up exactly to the order total.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import User from "@/models/User";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Admin from "@/models/Admin";
import { verifyJWT } from "@/lib/verifyJWT";
import { hasPermission, canViewPayments } from "@/lib/hasPermission";

const CANCELLED = ["Cancelled", "Rejected"];
const DELIVERED = ["Order Delivered", "Delivered"];
const STATUS_GROUPS = ["valid", "delivered", "in_progress", "cancelled", "all"];

const IST_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isId = (v) => v && mongoose.Types.ObjectId.isValid(v);

// "2026-08-01" -> Date at 00:00 IST (or 23:59:59.999 IST when endOfDay)
function istDay(str, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str || "")) return null;
  const d = new Date(`${str}T00:00:00.000+05:30`);
  if (isNaN(d)) return null;
  return endOfDay ? new Date(d.getTime() + DAY_MS - 1) : d;
}

// Bucket key + label for a date, in IST
function bucketOf(date, groupBy) {
  const x = new Date(new Date(date).getTime() + IST_MS);
  const y = x.getUTCFullYear();
  const m = x.getUTCMonth();
  if (groupBy === "day") {
    return { key: `${y}-${pad(m + 1)}-${pad(x.getUTCDate())}`, label: `${pad(x.getUTCDate())} ${MONTHS[m]} ${y}` };
  }
  if (groupBy === "week") {
    // Week starts Monday
    const dow = (x.getUTCDay() + 6) % 7;
    const s = new Date(Date.UTC(y, m, x.getUTCDate() - dow));
    return {
      key: `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`,
      label: `Week of ${pad(s.getUTCDate())} ${MONTHS[s.getUTCMonth()]} ${s.getUTCFullYear()}`,
    };
  }
  return { key: `${y}-${pad(m + 1)}`, label: `${MONTHS[m]} ${y}` };
}

// Every bucket between two dates, so months with no sales still show up as zero
function bucketRange(start, end, groupBy) {
  const out = [];
  if (!start || !end || start > end) return out;
  const step = groupBy === "day" ? DAY_MS : 7 * DAY_MS;
  const seen = new Set();
  let t = new Date(start).getTime();
  const endT = new Date(end).getTime();
  let guard = 0;
  while (t <= endT + step && guard++ < 1500) {
    const b = bucketOf(t, groupBy);
    if (b.key > bucketOf(endT, groupBy).key) break;
    if (!seen.has(b.key)) { seen.add(b.key); out.push(b); }
    if (groupBy === "month") {
      const x = new Date(t + IST_MS);
      t = Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 1) - IST_MS;
    } else {
      t += step;
    }
  }
  return out;
}

function statusGroupOf(status) {
  if (CANCELLED.includes(status)) return "cancelled";
  if (DELIVERED.includes(status)) return "delivered";
  return "in_progress";
}

function inStatusGroup(status, group) {
  const g = statusGroupOf(status);
  if (group === "all") return true;
  if (group === "valid") return g !== "cancelled";
  return g === group;
}

// selectedAttrs can hold plain values or { label, value } objects
function attrsText(attrs) {
  if (!attrs || typeof attrs !== "object") return "";
  return Object.entries(attrs)
    .map(([k, v]) => {
      let val = v;
      if (Array.isArray(v)) val = v.map((x) => (x && typeof x === "object" ? x.label ?? x.value ?? "" : x)).join(", ");
      else if (v && typeof v === "object") val = v.label ?? v.value ?? v.name ?? "";
      return val === "" || val == null ? "" : `${k}: ${val}`;
    })
    .filter(Boolean)
    .join(" | ");
}

const titleCase = (s) =>
  String(s || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function emptyTotals() {
  return { gross: 0, discount: 0, gst: 0, net: 0, units: 0, orders: new Set(), customers: new Set(), products: new Set() };
}

function addTo(t, line) {
  t.gross += line.gross;
  t.discount += line.discount;
  t.gst += line.gst;
  t.net += line.net;
  t.units += line.qty;
  t.orders.add(line.orderId);
  if (line.customerId) t.customers.add(line.customerId);
  t.products.add(line.productKey);
}

function finishTotals(t) {
  const orders = t.orders.size;
  return {
    gross: r2(t.gross),
    discount: r2(t.discount),
    gst: r2(t.gst),
    net: r2(t.net),
    taxable: r2(t.net - t.gst),
    units: r2(t.units),
    orders,
    customers: t.customers.size,
    products: t.products.size,
    avgOrderValue: orders ? r2(t.net / orders) : 0,
    avgUnitPrice: t.units ? r2(t.gross / t.units) : 0,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();

    /* ── Auth ─────────────────────────────────────────────────────────────── */
    const token = req.cookies.admin_auth;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const decoded = verifyJWT(token);
    if (!decoded) return res.status(401).json({ message: "Unauthorized" });
    const adminUser = await Admin.findById(decoded.id, { role: 1, permissions: 1 });
    if (!adminUser) return res.status(401).json({ message: "Unauthorized" });
    const user = { id: adminUser._id, role: adminUser.role, permissions: adminUser.permissions || [] };
    if (!hasPermission(user, "reports.product_sales")) return res.status(403).json({ message: "No permission" });
    const showPayments = canViewPayments(user);

    /* ── Params ───────────────────────────────────────────────────────────── */
    const q = req.query;
    const groupBy = ["month", "week", "day"].includes(q.groupBy) ? q.groupBy : "month";
    const statusGroup = STATUS_GROUPS.includes(q.status) ? q.status : "valid";
    const from = istDay(q.from);
    const to = istDay(q.to, true);
    if (from && to && from > to) return res.status(400).json({ message: "From date must be before To date" });

    // Previous period of the same length, for growth comparison
    let prevFrom = null;
    let prevTo = null;
    if (from && to) {
      prevTo = new Date(from.getTime() - 1);
      prevFrom = new Date(prevTo.getTime() - (to.getTime() - from.getTime()));
    }

    /* ── Reference data ───────────────────────────────────────────────────── */
    const [categories, allProducts] = await Promise.all([
      Category.find({}).select("_id name parent").sort({ name: 1 }).lean(),
      Product.find({}).select("_id name sku category status productFor hsnCode createdAt").sort({ name: 1 }).lean(),
    ]);
    const catName = new Map(categories.map((c) => [String(c._id), c.name]));
    const productById = new Map(allProducts.map((p) => [String(p._id), p]));

    // Category filter includes all sub-categories
    let productSet = null;
    if (isId(q.category)) {
      const ids = new Set([String(q.category)]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const c of categories) {
          if (c.parent && ids.has(String(c.parent)) && !ids.has(String(c._id))) { ids.add(String(c._id)); grew = true; }
        }
      }
      productSet = new Set(allProducts.filter((p) => ids.has(String(p.category))).map((p) => String(p._id)));
    }
    if (isId(q.product)) {
      const pid = String(q.product);
      productSet = productSet ? new Set([...productSet].filter((x) => x === pid)) : new Set([pid]);
    }

    /* ── Order query (status is applied per line below, so cancellations can be reported too) ── */
    const filter = {};
    const createdAt = {};
    if (prevFrom || from) createdAt.$gte = prevFrom || from;
    if (to) createdAt.$lte = to;
    if (Object.keys(createdAt).length) filter.createdAt = createdAt;
    if (productSet) filter["items.product"] = { $in: [...productSet].map((id) => new mongoose.Types.ObjectId(id)) };
    if (showPayments && ["Wallet", "Razorpay"].includes(q.paymentMethod)) filter.paymentMethod = q.paymentMethod;
    if (showPayments && ["PAID", "UNPAID", "REFUNDED"].includes(q.paymentStatus)) filter.paymentStatus = q.paymentStatus;
    if (q.state && q.state.trim()) filter["shipping.state"] = new RegExp(`^\\s*${escapeRegex(q.state.trim())}\\s*$`, "i");

    const and = [];
    if (["partner", "customer"].includes(q.userType)) {
      const ids = await User.find({ userType: q.userType }).distinct("_id");
      and.push({ user: { $in: ids } });
    }
    if (q.search && q.search.trim()) {
      const rx = new RegExp(escapeRegex(q.search.trim()), "i");
      const ids = await User.find({ $or: [{ name: rx }, { companyName: rx }, { email: rx }, { phone: rx }, { memberId: rx }] }).distinct("_id");
      and.push({ $or: [{ orderNumber: rx }, { orderName: rx }, { "shipping.name": rx }, { user: { $in: ids } }] });
    }
    if (and.length) filter.$and = and;

    const orders = await Order.find(filter)
      .select("orderNumber orderName user items.product items.productName items.quantity items.price items.selectedAttrs shipping.state shipping.city shipping.name paymentMethod paymentStatus status total gstAmount coupon subtotal createdAt deliveredAt")
      .populate({ path: "user", select: "name companyName userType email phone state city memberId" })
      .sort({ createdAt: 1 })
      .lean();

    /* ── Flatten into lines ───────────────────────────────────────────────── */
    const current = [];
    const previous = [];
    const statesSeen = new Set();

    for (const o of orders) {
      const items = o.items || [];
      const grossSum = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.price) || 0), 0);
      const total = Number(o.total) || 0;
      const gstAmount = Number(o.gstAmount) || 0;
      const discount = Number(o.coupon?.discountAmount) || 0;
      const isPrev = prevFrom && o.createdAt < from;
      const stateName = titleCase(o.shipping?.state || o.user?.state);
      if (stateName) statesSeen.add(stateName);

      items.forEach((it, idx) => {
        const pid = it.product ? String(it.product) : "";
        if (productSet && !productSet.has(pid)) return;

        const qty = Number(it.quantity) || 0;
        const price = Number(it.price) || 0;
        const gross = qty * price;
        const share = grossSum > 0 ? gross / grossSum : items.length ? 1 / items.length : 0;
        const p = productById.get(pid);

        const line = {
          orderId: String(o._id),
          orderNumber: o.orderNumber || "",
          orderName: o.orderName || "",
          date: o.createdAt,
          deliveredAt: o.deliveredAt || null,
          status: o.status,
          statusGroup: statusGroupOf(o.status),
          customerId: o.user?._id ? String(o.user._id) : "",
          customerName: o.user?.name || o.shipping?.name || "Deleted customer",
          company: o.user?.companyName || "",
          customerType: o.user?.userType === "partner" ? "B2B" : o.user?.userType === "customer" ? "B2C" : "-",
          email: o.user?.email || "",
          phone: o.user?.phone || "",
          state: stateName,
          city: titleCase(o.shipping?.city || o.user?.city),
          productKey: pid || `name:${it.productName || "Unknown"}`,
          productId: pid,
          productName: p?.name || it.productName || "Deleted product",
          sku: p?.sku || "",
          hsnCode: p?.hsnCode || "",
          categoryId: p?.category ? String(p.category) : "",
          category: (p?.category && catName.get(String(p.category))) || "Uncategorised",
          options: attrsText(it.selectedAttrs),
          lineNo: idx + 1,
          qty,
          price: r2(price),
          gross: r2(gross),
          discount: r2(discount * share),
          gst: r2(gstAmount * share),
          net: r2(total * share),
          ...(showPayments ? { paymentMethod: o.paymentMethod || "", paymentStatus: o.paymentStatus || "" } : {}),
        };
        (isPrev ? previous : current).push(line);
      });
    }

    const selected = current.filter((l) => inStatusGroup(l.status, statusGroup));
    const selectedPrev = previous.filter((l) => inStatusGroup(l.status, statusGroup));

    /* ── Summary ──────────────────────────────────────────────────────────── */
    const tot = emptyTotals();
    selected.forEach((l) => addTo(tot, l));
    const summary = finishTotals(tot);

    const prevTot = emptyTotals();
    selectedPrev.forEach((l) => addTo(prevTot, l));
    const previousSummary = prevFrom ? finishTotals(prevTot) : null;

    // Cancellations are always measured against the same filters, whatever status is selected
    const cancelledLines = current.filter((l) => l.statusGroup === "cancelled");
    const cancelledOrders = new Set(cancelledLines.map((l) => l.orderId)).size;
    const allOrders = new Set(current.map((l) => l.orderId)).size;
    const deliveredOrders = new Set(current.filter((l) => l.statusGroup === "delivered").map((l) => l.orderId)).size;
    summary.cancelledOrders = cancelledOrders;
    summary.cancelledValue = r2(cancelledLines.reduce((s, l) => s + l.net, 0));
    summary.cancelledUnits = r2(cancelledLines.reduce((s, l) => s + l.qty, 0));
    summary.cancellationRate = allOrders ? r2((cancelledOrders / allOrders) * 100) : 0;
    summary.deliveredOrders = deliveredOrders;
    summary.inProgressOrders = new Set(current.filter((l) => l.statusGroup === "in_progress").map((l) => l.orderId)).size;
    summary.allOrders = allOrders;

    /* ── Trend buckets ────────────────────────────────────────────────────── */
    const firstDate = from || (current[0]?.date ?? null);
    const lastDate = to ? new Date(Math.min(to.getTime(), Date.now())) : (current[current.length - 1]?.date ?? null);
    const buckets = bucketRange(firstDate, lastDate, groupBy);
    const bucketMap = new Map(buckets.map((b) => [b.key, { ...b, t: emptyTotals(), cancelledValue: 0, cancelledOrders: new Set() }]));
    const bucketFor = (date) => {
      const b = bucketOf(date, groupBy);
      if (!bucketMap.has(b.key)) bucketMap.set(b.key, { ...b, t: emptyTotals(), cancelledValue: 0, cancelledOrders: new Set() });
      return bucketMap.get(b.key);
    };
    selected.forEach((l) => addTo(bucketFor(l.date).t, l));
    cancelledLines.forEach((l) => {
      const b = bucketFor(l.date);
      b.cancelledValue += l.net;
      b.cancelledOrders.add(l.orderId);
    });
    const trend = [...bucketMap.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((b) => ({ key: b.key, label: b.label, ...finishTotals(b.t), cancelledValue: r2(b.cancelledValue), cancelledOrders: b.cancelledOrders.size }));

    /* ── Products ─────────────────────────────────────────────────────────── */
    const prodMap = new Map();
    const prodOf = (l) => {
      if (!prodMap.has(l.productKey)) {
        prodMap.set(l.productKey, {
          productKey: l.productKey, productId: l.productId, name: l.productName, sku: l.sku, hsnCode: l.hsnCode,
          category: l.category, categoryId: l.categoryId,
          t: emptyTotals(), b2b: { units: 0, net: 0 }, b2c: { units: 0, net: 0 },
          minPrice: Infinity, maxPrice: 0, firstSold: null, lastSold: null,
          cancelledUnits: 0, cancelledValue: 0, cancelledOrders: new Set(),
          prevNet: 0, prevUnits: 0, buckets: {},
        });
      }
      return prodMap.get(l.productKey);
    };

    for (const l of selected) {
      const p = prodOf(l);
      addTo(p.t, l);
      const side = l.customerType === "B2B" ? p.b2b : l.customerType === "B2C" ? p.b2c : null;
      if (side) { side.units += l.qty; side.net += l.net; }
      if (l.qty > 0) { p.minPrice = Math.min(p.minPrice, l.price); p.maxPrice = Math.max(p.maxPrice, l.price); }
      if (!p.firstSold || l.date < p.firstSold) p.firstSold = l.date;
      if (!p.lastSold || l.date > p.lastSold) p.lastSold = l.date;
      const bk = bucketOf(l.date, groupBy).key;
      const cell = (p.buckets[bk] ||= { net: 0, units: 0, orders: 0 });
      cell.net += l.net;
      cell.units += l.qty;
      cell.orders += 1;
    }
    for (const l of cancelledLines) {
      const p = prodOf(l);
      p.cancelledUnits += l.qty;
      p.cancelledValue += l.net;
      p.cancelledOrders.add(l.orderId);
    }
    for (const l of selectedPrev) {
      const p = prodOf(l);
      p.prevNet += l.net;
      p.prevUnits += l.qty;
    }

    const products = [...prodMap.values()]
      .map((p) => {
        const t = finishTotals(p.t);
        let best = null;
        for (const [k, c] of Object.entries(p.buckets)) {
          c.net = r2(c.net);
          c.units = r2(c.units);
          if (!best || c.net > best.net) best = { key: k, ...c };
        }
        const bestLabel = best ? trend.find((b) => b.key === best.key)?.label || best.key : "";
        return {
          productKey: p.productKey, productId: p.productId, name: p.name, sku: p.sku, hsnCode: p.hsnCode,
          category: p.category, categoryId: p.categoryId,
          orders: t.orders, units: t.units, customers: t.customers,
          gross: t.gross, discount: t.discount, gst: t.gst, taxable: t.taxable, net: t.net,
          avgPrice: t.avgUnitPrice,
          minPrice: p.minPrice === Infinity ? 0 : r2(p.minPrice), maxPrice: r2(p.maxPrice),
          b2bUnits: r2(p.b2b.units), b2bNet: r2(p.b2b.net), b2cUnits: r2(p.b2c.units), b2cNet: r2(p.b2c.net),
          firstSold: p.firstSold, lastSold: p.lastSold,
          cancelledUnits: r2(p.cancelledUnits), cancelledValue: r2(p.cancelledValue), cancelledOrders: p.cancelledOrders.size,
          prevNet: r2(p.prevNet), prevUnits: r2(p.prevUnits),
          growth: prevFrom ? (p.prevNet > 0 ? r2(((t.net - p.prevNet) / p.prevNet) * 100) : t.net > 0 ? null : 0) : undefined,
          share: summary.net > 0 ? r2((t.net / summary.net) * 100) : 0,
          bestPeriod: bestLabel, bestPeriodNet: best ? best.net : 0,
          buckets: p.buckets,
        };
      })
      .sort((a, b) => b.net - a.net || b.units - a.units);
    products.forEach((p, i) => { p.rank = p.orders ? i + 1 : null; });

    // Best-selling product for every period
    const periodLeaders = trend.map((b) => {
      let top = null;
      let runnerUp = null;
      for (const p of products) {
        const c = p.buckets[b.key];
        if (!c || c.net <= 0) continue;
        if (!top || c.net > top.net) { runnerUp = top; top = { name: p.name, productKey: p.productKey, net: c.net, units: c.units }; }
        else if (!runnerUp || c.net > runnerUp.net) runnerUp = { name: p.name, productKey: p.productKey, net: c.net, units: c.units };
      }
      return { key: b.key, label: b.label, total: b.net, top, runnerUp, share: top && b.net ? r2((top.net / b.net) * 100) : 0 };
    });

    /* ── Categories, customers, states, splits ────────────────────────────── */
    const groupLines = (keyFn, extra) => {
      const m = new Map();
      for (const l of selected) {
        const k = keyFn(l);
        if (!m.has(k)) m.set(k, { key: k, t: emptyTotals(), ...(extra ? extra(l) : {}) });
        addTo(m.get(k).t, l);
      }
      return [...m.values()]
        .map(({ t, ...rest }) => {
          const f = finishTotals(t);
          return { ...rest, ...f, share: summary.net > 0 ? r2((f.net / summary.net) * 100) : 0 };
        })
        .sort((a, b) => b.net - a.net);
    };

    const categoryRows = groupLines((l) => l.category, (l) => ({ name: l.category, categoryId: l.categoryId }));
    const customers = groupLines(
      (l) => l.customerId || `guest:${l.customerName}`,
      (l) => ({ name: l.customerName, company: l.company, type: l.customerType, email: l.email, phone: l.phone, state: l.state })
    );
    const lastOrderOf = new Map();
    for (const l of selected) {
      const k = l.customerId || `guest:${l.customerName}`;
      if (!lastOrderOf.has(k) || l.date > lastOrderOf.get(k)) lastOrderOf.set(k, l.date);
    }
    customers.forEach((c) => { c.lastOrder = lastOrderOf.get(c.key) || null; });
    const states = groupLines((l) => l.state || "Not specified", (l) => ({ name: l.state || "Not specified" }));
    const customerTypes = groupLines((l) => l.customerType, (l) => ({ name: l.customerType === "-" ? "Unknown" : l.customerType }));
    const statusBreakdown = (() => {
      const m = new Map();
      for (const l of current) {
        if (!m.has(l.status)) m.set(l.status, { name: l.status, orders: new Set(), net: 0, units: 0 });
        const s = m.get(l.status);
        s.orders.add(l.orderId);
        s.net += l.net;
        s.units += l.qty;
      }
      return [...m.values()].map((s) => ({ name: s.name, orders: s.orders.size, net: r2(s.net), units: r2(s.units) })).sort((a, b) => b.orders - a.orders);
    })();
    const paymentMethods = showPayments ? groupLines((l) => l.paymentMethod || "Unknown", (l) => ({ name: l.paymentMethod || "Unknown" })) : [];
    const paymentStatuses = showPayments ? groupLines((l) => l.paymentStatus || "Unknown", (l) => ({ name: l.paymentStatus || "Unknown" })) : [];

    /* ── Products with no sales in this period ───────────────────────────── */
    const soldKeys = new Set(products.filter((p) => p.orders > 0).map((p) => p.productId));
    const candidates = allProducts.filter((p) => {
      if (p.status !== "published") return false;
      if (productSet && !productSet.has(String(p._id))) return false;
      if (q.userType === "partner" && p.productFor === "b2c") return false;
      if (q.userType === "customer" && p.productFor === "b2b") return false;
      return !soldKeys.has(String(p._id));
    });
    let lastSoldEver = new Map();
    if (candidates.length) {
      const rows = await Order.aggregate([
        { $match: { status: { $nin: CANCELLED }, "items.product": { $in: candidates.map((p) => p._id) } } },
        { $unwind: "$items" },
        { $match: { "items.product": { $in: candidates.map((p) => p._id) } } },
        { $group: { _id: "$items.product", last: { $max: "$createdAt" }, units: { $sum: "$items.quantity" } } },
      ]);
      lastSoldEver = new Map(rows.map((r) => [String(r._id), r]));
    }
    const noSales = candidates
      .map((p) => {
        const ever = lastSoldEver.get(String(p._id));
        return {
          productId: String(p._id), name: p.name, sku: p.sku || "",
          category: catName.get(String(p.category)) || "Uncategorised",
          productFor: p.productFor, listedOn: p.createdAt,
          lastSold: ever?.last || null, lifetimeUnits: ever ? r2(ever.units) : 0,
        };
      })
      .sort((a, b) => (a.lastSold ? new Date(a.lastSold) : 0) - (b.lastSold ? new Date(b.lastSold) : 0));

    /* ── Filter options ───────────────────────────────────────────────────── */
    const options = {
      categories: categories.map((c) => ({ _id: c._id, name: c.name, parent: c.parent })),
      products: allProducts.map((p) => ({ _id: p._id, name: p.name, category: p.category })),
      states: [...statesSeen].sort(),
    };

    return res.status(200).json({
      generatedAt: new Date(),
      filters: { from: q.from || "", to: q.to || "", groupBy, status: statusGroup },
      previousRange: prevFrom ? { from: prevFrom, to: prevTo } : null,
      canViewPayments: showPayments,
      summary,
      previousSummary,
      trend,
      products,
      periodLeaders,
      categories: categoryRows,
      customers,
      states,
      customerTypes,
      statusBreakdown,
      paymentMethods,
      paymentStatuses,
      noSales,
      lines: selected.slice().reverse(),
      options,
    });
  } catch (err) {
    console.error("Product sales report error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
