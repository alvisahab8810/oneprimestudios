// pages/api/admin/coupons/report.js
// GET — coupon performance by month and abandoned carts.
//
// Query params (all optional):
//   from, to        YYYY-MM-DD (IST calendar days, inclusive). Default: last 12 months.
//   userType        partner | customer
//   abandonHours    a cart with items untouched for this many hours counts as abandoned (default 24)
//
// Coupon "uses" count orders that carried the coupon and were not cancelled or rejected.
// Cancelled uses are reported separately. "Users" are distinct customers.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Coupon from "@/models/Coupon";
import Cart from "@/models/Cart";
import User from "@/models/User";
import Product from "@/models/Product";
import { requireAdminPermission } from "@/lib/adminAuth";

const CANCELLED = ["Cancelled", "Rejected"];
const IST_MS = 330 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function istDay(str, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str || "")) return null;
  const d = new Date(`${str}T00:00:00.000+05:30`);
  if (isNaN(d)) return null;
  return endOfDay ? new Date(d.getTime() + DAY_MS - 1) : d;
}

function istYmd(date) {
  const x = new Date(new Date(date).getTime() + IST_MS);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}

function monthOf(date) {
  const x = new Date(new Date(date).getTime() + IST_MS);
  const y = x.getUTCFullYear();
  const m = x.getUTCMonth();
  return { key: `${y}-${pad(m + 1)}`, label: `${MONTHS[m]} ${y}` };
}

// Every month between two dates, so empty months still show as zero
function monthRange(start, end) {
  const out = [];
  const a = monthOf(start).key.split("-").map(Number);
  const b = monthOf(end).key;
  let y = a[0];
  let m = a[1] - 1;
  for (let guard = 0; guard < 240; guard++) {
    const key = `${y}-${pad(m + 1)}`;
    if (key > b) break;
    out.push({ key, label: `${MONTHS[m]} ${y}` });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return out;
}

function idTime(id) {
  try {
    return id ? new mongoose.Types.ObjectId(String(id)).getTimestamp() : null;
  } catch {
    return null;
  }
}

function couponState(c, now) {
  if (c.expiryDate && new Date(c.expiryDate) < now) return "expired";
  if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) return "limit_reached";
  if (!c.isActive) return "inactive";
  return "active";
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const admin = await requireAdminPermission(req, res, "coupons");
    if (!admin) return;

    /* ── Params ───────────────────────────────────────────────────────────── */
    const now = new Date();
    let end = istDay(req.query.to, true) || istDay(istYmd(now), true);
    let start = istDay(req.query.from);
    if (!start) {
      // First day of the month 11 months back, so 12 calendar months including this one
      const [y, m] = monthOf(end).key.split("-").map(Number);
      const back = m - 11;
      start = back > 0
        ? new Date(`${y}-${pad(back)}-01T00:00:00.000+05:30`)
        : new Date(`${y - 1}-${pad(back + 12)}-01T00:00:00.000+05:30`);
    }
    if (start > end) [start, end] = [istDay(istYmd(end)), new Date(start.getTime() + DAY_MS - 1)];

    const userType = ["partner", "customer"].includes(req.query.userType) ? req.query.userType : "";
    const abandonHours = Math.min(Math.max(Number(req.query.abandonHours) || 24, 1), 24 * 90);

    const months = monthRange(start, end);

    /* ── Users (for names and the user-type filter) ──────────────────────── */
    const userCache = new Map();
    const loadUsers = async (ids) => {
      const missing = [...new Set(ids.map(String))].filter((id) => id && !userCache.has(id) && mongoose.Types.ObjectId.isValid(id));
      if (!missing.length) return;
      const docs = await User.find(
        { _id: { $in: missing } },
        { name: 1, companyName: 1, email: 1, phone: 1, userType: 1 }
      ).lean();
      docs.forEach((u) => userCache.set(String(u._id), u));
    };
    const userInfo = (id) => {
      const u = userCache.get(String(id));
      return {
        id: id ? String(id) : null,
        name: u?.name || "Unknown user",
        company: u?.companyName || "",
        email: u?.email || "",
        phone: u?.phone || "",
        userType: u?.userType || "",
      };
    };

    /* ── Coupon orders (all time, for lifetime stats) ────────────────────── */
    const couponOrdersRaw = await Order.find(
      { "coupon.code": { $nin: [null, ""] } },
      { orderNumber: 1, user: 1, status: 1, paymentStatus: 1, subtotal: 1, total: 1, gstAmount: 1, coupon: 1, createdAt: 1, shipping: 1 }
    ).lean();
    await loadUsers(couponOrdersRaw.map((o) => o.user));

    const couponOrders = couponOrdersRaw.filter((o) => !userType || userCache.get(String(o.user))?.userType === userType);
    const code = (o) => String(o.coupon?.code || "").toUpperCase();
    const isCancelled = (o) => CANCELLED.includes(o.status);

    /* ── Lifetime stats per coupon ───────────────────────────────────────── */
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    const life = new Map();
    for (const o of couponOrders) {
      const k = code(o);
      if (!life.has(k)) life.set(k, { orders: 0, cancelled: 0, users: new Set(), discount: 0, revenue: 0, firstUsed: null, lastUsed: null });
      const s = life.get(k);
      if (isCancelled(o)) { s.cancelled++; continue; }
      s.orders++;
      if (o.user) s.users.add(String(o.user));
      s.discount += Number(o.coupon?.discountAmount) || 0;
      s.revenue += Number(o.total) || 0;
      if (!s.firstUsed || o.createdAt < s.firstUsed) s.firstUsed = o.createdAt;
      if (!s.lastUsed || o.createdAt > s.lastUsed) s.lastUsed = o.createdAt;
    }
    const lifeOut = (k) => {
      const s = life.get(k);
      return s
        ? { orders: s.orders, cancelled: s.cancelled, uniqueUsers: s.users.size, discount: r2(s.discount), revenue: r2(s.revenue), firstUsed: s.firstUsed, lastUsed: s.lastUsed }
        : { orders: 0, cancelled: 0, uniqueUsers: 0, discount: 0, revenue: 0, firstUsed: null, lastUsed: null };
    };

    const couponRows = coupons.map((c) => ({
      ...c,
      _id: String(c._id),
      state: couponState(c, now),
      stats: lifeOut(c.code),
    }));
    const knownCodes = new Set(coupons.map((c) => c.code));

    /* ── Usage inside the selected range ─────────────────────────────────── */
    const inRange = (d) => d && d >= start && d <= end;
    const rangeOrders = couponOrders.filter((o) => inRange(o.createdAt));

    const usage = new Map(); // code -> row
    const monthTotals = new Map(months.map((m) => [m.key, { uses: 0, cancelled: 0, users: new Set(), codes: new Map(), discount: 0, revenue: 0 }]));
    const allUsers = new Set();
    let uses = 0, cancelledUses = 0, discount = 0, revenue = 0, subtotal = 0;

    for (const o of rangeOrders) {
      const k = code(o);
      const mk = monthOf(o.createdAt).key;
      if (!usage.has(k)) {
        const c = coupons.find((x) => x.code === k);
        usage.set(k, {
          code: k,
          deleted: !knownCodes.has(k),
          discountType: c?.discountType || o.coupon?.discountType || "",
          discountValue: c?.discountValue ?? o.coupon?.discountValue ?? null,
          uses: 0, cancelled: 0, users: new Set(), discount: 0, revenue: 0, subtotal: 0,
          byMonth: {},
        });
      }
      const u = usage.get(k);
      if (!u.byMonth[mk]) u.byMonth[mk] = { uses: 0, cancelled: 0, users: new Set(), discount: 0 };
      const cell = u.byMonth[mk];
      const mt = monthTotals.get(mk);

      if (isCancelled(o)) {
        u.cancelled++; cell.cancelled++; cancelledUses++;
        if (mt) mt.cancelled++;
        continue;
      }
      const d = Number(o.coupon?.discountAmount) || 0;
      const t = Number(o.total) || 0;
      const st = Number(o.subtotal) || 0;
      u.uses++; u.discount += d; u.revenue += t; u.subtotal += st;
      cell.uses++; cell.discount += d;
      if (o.user) { u.users.add(String(o.user)); cell.users.add(String(o.user)); allUsers.add(String(o.user)); }
      uses++; discount += d; revenue += t; subtotal += st;
      if (mt) {
        mt.uses++; mt.discount += d; mt.revenue += t;
        if (o.user) mt.users.add(String(o.user));
        mt.codes.set(k, (mt.codes.get(k) || 0) + 1);
      }
    }

    const usageRows = [...usage.values()]
      .map((u) => ({
        code: u.code,
        deleted: u.deleted,
        discountType: u.discountType,
        discountValue: u.discountValue,
        uses: u.uses,
        cancelled: u.cancelled,
        uniqueUsers: u.users.size,
        discount: r2(u.discount),
        revenue: r2(u.revenue),
        avgDiscount: u.uses ? r2(u.discount / u.uses) : 0,
        discountPct: u.subtotal ? r2((u.discount / u.subtotal) * 100) : 0,
        activeMonths: Object.values(u.byMonth).filter((c) => c.uses > 0).length,
        byMonth: Object.fromEntries(
          Object.entries(u.byMonth).map(([mk, c]) => [mk, { uses: c.uses, cancelled: c.cancelled, users: c.users.size, discount: r2(c.discount) }])
        ),
      }))
      .sort((a, b) => b.uses - a.uses || b.discount - a.discount || a.code.localeCompare(b.code));

    const monthly = months.map((m) => {
      const t = monthTotals.get(m.key);
      const top = [...t.codes.entries()].sort((a, b) => b[1] - a[1])[0];
      return {
        ...m,
        uses: t.uses,
        cancelled: t.cancelled,
        uniqueUsers: t.users.size,
        couponsUsed: t.codes.size,
        topCoupon: top ? { code: top[0], uses: top[1] } : null,
        discount: r2(t.discount),
        revenue: r2(t.revenue),
      };
    });

    const orderRows = rangeOrders
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((o) => ({
        id: String(o._id),
        orderNumber: o.orderNumber || String(o._id).slice(-8),
        date: o.createdAt,
        code: code(o),
        customer: userInfo(o.user),
        status: o.status,
        cancelled: isCancelled(o),
        paymentStatus: o.paymentStatus,
        subtotal: r2(o.subtotal),
        discount: r2(o.coupon?.discountAmount),
        total: r2(o.total),
      }));

    // Orders placed in range (with or without a coupon) — for coupon adoption and abandonment rate
    const orderMatch = { createdAt: { $gte: start, $lte: end }, status: { $nin: CANCELLED } };
    const rangeAllOrders = await Order.find(orderMatch, { user: 1, coupon: 1 }).lean();
    await loadUsers(rangeAllOrders.map((o) => o.user));
    const rangeOrdersFiltered = rangeAllOrders.filter((o) => !userType || userCache.get(String(o.user))?.userType === userType);
    const totalOrders = rangeOrdersFiltered.length;

    /* ── Abandoned carts ─────────────────────────────────────────────────── */
    const carts = await Cart.find({ "items.0": { $exists: true } }).lean();
    await loadUsers(carts.map((c) => c.user));

    const productIds = [...new Set(carts.flatMap((c) => c.items.map((i) => String(i.product))))].filter((id) => mongoose.Types.ObjectId.isValid(id));
    const products = await Product.find({ _id: { $in: productIds } }, { name: 1, mainImage: 1, slug: 1 }).lean();
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    // Last order per user (any time) to see whether the shopper came back
    const cartUserIds = [...new Set(carts.map((c) => String(c.user)))].filter((id) => mongoose.Types.ObjectId.isValid(id));
    const lastOrders = await Order.aggregate([
      { $match: { user: { $in: cartUserIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: "$user", last: { $max: "$createdAt" }, count: { $sum: 1 } } },
    ]);
    const lastOrderMap = new Map(lastOrders.map((x) => [String(x._id), x]));

    const cutoff = new Date(now.getTime() - abandonHours * HOUR_MS);
    const cartRows = [];
    let activeCarts = 0;

    for (const c of carts) {
      const u = userCache.get(String(c.user));
      if (userType && u?.userType !== userType) continue;

      const itemTimes = c.items.map((i) => idTime(i._id)).filter(Boolean);
      const lastActivity = c.updatedAt || (itemTimes.length ? new Date(Math.max(...itemTimes.map((d) => d.getTime()))) : idTime(c._id));
      if (!lastActivity) continue;

      if (lastActivity > cutoff) { activeCarts++; continue; }
      if (!inRange(lastActivity)) continue;

      const items = c.items.map((i) => {
        const p = productMap.get(String(i.product));
        const qty = Number(i.quantity) || 0;
        const price = Number(i.price) || 0;
        return {
          productId: String(i.product),
          name: p?.name || "Deleted product",
          image: p?.mainImage || "",
          slug: p?.slug || "",
          quantity: qty,
          price: r2(price),
          value: r2(qty * price),
          orderName: i.orderName || "",
          attrs: Object.entries(i.selectedAttrs || {})
            .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
            .map(([k, v]) => `${k}: ${v}`)
            .slice(0, 4),
        };
      });
      const lo = lastOrderMap.get(String(c.user));
      const orderedSince = !!(lo && lo.last > lastActivity);

      cartRows.push({
        id: String(c._id),
        customer: userInfo(c.user),
        items,
        itemCount: items.length,
        quantity: items.reduce((s, i) => s + i.quantity, 0),
        value: r2(items.reduce((s, i) => s + i.value, 0)),
        lastActivity,
        ageHours: Math.round((now - lastActivity) / HOUR_MS),
        ordersEver: lo?.count || 0,
        lastOrderAt: lo?.last || null,
        orderedSince,
      });
    }
    cartRows.sort((a, b) => b.value - a.value);

    const AGE_BUCKETS = [
      { key: "lt1", label: "Under 1 day", max: 24 },
      { key: "1to3", label: "1–3 days", max: 72 },
      { key: "3to7", label: "3–7 days", max: 168 },
      { key: "7to30", label: "7–30 days", max: 720 },
      { key: "gt30", label: "Over 30 days", max: Infinity },
    ];
    const byAge = AGE_BUCKETS.map((b) => ({ key: b.key, label: b.label, carts: 0, value: 0 }));
    const byProductMap = new Map();
    const byMonthCart = new Map(months.map((m) => [m.key, { carts: 0, value: 0 }]));

    for (const c of cartRows) {
      const idx = AGE_BUCKETS.findIndex((b) => c.ageHours < b.max);
      byAge[idx].carts++;
      byAge[idx].value += c.value;
      const mk = byMonthCart.get(monthOf(c.lastActivity).key);
      if (mk) { mk.carts++; mk.value += c.value; }
      for (const i of c.items) {
        if (!byProductMap.has(i.productId)) byProductMap.set(i.productId, { productId: i.productId, name: i.name, image: i.image, carts: 0, quantity: 0, value: 0 });
        const p = byProductMap.get(i.productId);
        p.carts++; p.quantity += i.quantity; p.value += i.value;
      }
    }

    const abandonedValue = cartRows.reduce((s, c) => s + c.value, 0);
    const abandonedCount = cartRows.length;

    /* ── Previous period (same length, just before) for the headline deltas ─ */
    const spanMs = end.getTime() - start.getTime() + 1;
    const prevStart = new Date(start.getTime() - spanMs);
    const prevEnd = new Date(start.getTime() - 1);
    const prevOrders = couponOrders.filter((o) => o.createdAt >= prevStart && o.createdAt <= prevEnd && !isCancelled(o));
    const prev = {
      uses: prevOrders.length,
      uniqueUsers: new Set(prevOrders.map((o) => String(o.user))).size,
      discount: r2(prevOrders.reduce((s, o) => s + (Number(o.coupon?.discountAmount) || 0), 0)),
    };

    return res.json({
      range: { from: istYmd(start), to: istYmd(end) },
      filters: { userType, abandonHours },
      generatedAt: now,
      months,
      summary: {
        uses,
        cancelledUses,
        uniqueUsers: allUsers.size,
        discount: r2(discount),
        revenue: r2(revenue),
        avgDiscount: uses ? r2(discount / uses) : 0,
        discountPct: subtotal ? r2((discount / subtotal) * 100) : 0,
        couponsUsed: usageRows.filter((u) => u.uses > 0).length,
        totalOrders,
        adoptionPct: totalOrders ? r2((uses / totalOrders) * 100) : 0,
        totalCoupons: coupons.length,
        activeCoupons: couponRows.filter((c) => c.state === "active").length,
        expiringSoon: couponRows.filter((c) => c.state === "active" && c.expiryDate && new Date(c.expiryDate) - now < 7 * DAY_MS).length,
        prev,
      },
      coupons: couponRows,
      usage: usageRows,
      monthly,
      orders: orderRows,
      abandoned: {
        summary: {
          carts: abandonedCount,
          users: new Set(cartRows.map((c) => c.customer.id)).size,
          value: r2(abandonedValue),
          avgValue: abandonedCount ? r2(abandonedValue / abandonedCount) : 0,
          items: cartRows.reduce((s, c) => s + c.itemCount, 0),
          recovered: cartRows.filter((c) => c.orderedSince).length,
          neverOrdered: cartRows.filter((c) => c.ordersEver === 0).length,
          activeCarts,
          ordersInRange: totalOrders,
          // Estimate: carts left behind out of all checkouts that could have happened
          ratePct: abandonedCount + totalOrders ? r2((abandonedCount / (abandonedCount + totalOrders)) * 100) : 0,
        },
        carts: cartRows,
        byAge: byAge.map((b) => ({ ...b, value: r2(b.value) })),
        byProduct: [...byProductMap.values()].map((p) => ({ ...p, value: r2(p.value) })).sort((a, b) => b.value - a.value),
        byMonth: months.map((m) => ({ ...m, ...byMonthCart.get(m.key), value: r2(byMonthCart.get(m.key).value) })),
      },
    });
  } catch (err) {
    console.error("Coupon report error:", err);
    return res.status(500).json({ message: "Failed to build coupon report" });
  }
}
