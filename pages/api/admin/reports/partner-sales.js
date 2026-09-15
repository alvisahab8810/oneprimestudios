// pages/api/admin/reports/partner-sales.js
// Sales report per buyer, for partners (B2B) or customers (B2C).
// GET ?userType=partner|customer&from=YYYY-MM-DD&to=YYYY-MM-DD (IST dates, both optional = all time)
// Cancelled / rejected orders are reported separately and never counted as sales.
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { requireAdminPermission } from "@/lib/adminAuth";

const CANCELLED = ["Cancelled", "Rejected"];
const DELIVERED = ["Order Delivered", "Delivered"];
const IST_MS = 330 * 60000;
const DAY_MS = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pad = (n) => String(n).padStart(2, "0");

// "YYYY-MM-DD" in IST -> UTC Date of that day's start
function istDay(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ""))) return null;
  const [y, m, d] = s.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) - IST_MS;
  return isNaN(t) ? null : new Date(t);
}
function monthOf(date) {
  const x = new Date(new Date(date).getTime() + IST_MS);
  const y = x.getUTCFullYear();
  const m = x.getUTCMonth();
  return { key: `${y}-${pad(m + 1)}`, label: `${MONTHS[m]} ${y}` };
}
function monthList(start, end) {
  const out = [];
  const s = new Date(start.getTime() + IST_MS);
  const e = new Date(end.getTime() + IST_MS);
  let y = s.getUTCFullYear();
  let m = s.getUTCMonth();
  while (y < e.getUTCFullYear() || (y === e.getUTCFullYear() && m <= e.getUTCMonth())) {
    out.push({ key: `${y}-${pad(m + 1)}`, label: `${MONTHS[m]} ${y}` });
    m++;
    if (m > 11) { m = 0; y++; }
    if (out.length > 120) break;
  }
  return out;
}

function totalsOf(orders) {
  const valid = orders.filter((o) => !CANCELLED.includes(o.status));
  const sales = valid.reduce((s, o) => s + (Number(o.total) || 0), 0);
  return {
    orders: valid.length,
    cancelled: orders.length - valid.length,
    sales: r2(sales),
    buyers: new Set(valid.map((o) => String(o.user))).size,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const admin = await requireAdminPermission(req, res, "reports.partner_sales");
    if (!admin) return;

    const userType = req.query.userType === "customer" ? "customer" : "partner";
    const fromDate = istDay(req.query.from);
    const toStart = istDay(req.query.to);
    const toDate = toStart ? new Date(toStart.getTime() + DAY_MS) : null; // exclusive
    if (fromDate && toDate && fromDate >= toDate) {
      return res.status(400).json({ message: "From date must be before To date" });
    }

    const users = await User.find(
      { userType },
      { name: 1, companyName: 1, memberId: 1, email: 1, phone: 1, city: 1, state: 1, gstNumber: 1, createdAt: 1, isApproved: 1 }
    ).lean();
    const userIds = users.map((u) => u._id);

    // Every order of these users: needed for "new buyer" and lifetime figures
    const allOrders = await Order.find(
      { user: { $in: userIds } },
      { user: 1, items: 1, total: 1, subtotal: 1, gstAmount: 1, coupon: 1, status: 1, paymentMethod: 1, paymentStatus: 1, shipping: 1, createdAt: 1, orderNumber: 1 }
    ).lean();

    const inRange = (d) => (!fromDate || d >= fromDate) && (!toDate || d < toDate);
    const orders = allOrders.filter((o) => inRange(new Date(o.createdAt)));

    // Previous period of equal length, only when both dates are set
    let prev = null;
    if (fromDate && toDate) {
      const len = toDate - fromDate;
      const pFrom = new Date(fromDate.getTime() - len);
      prev = totalsOf(allOrders.filter((o) => { const d = new Date(o.createdAt); return d >= pFrom && d < fromDate; }));
    }

    // First ever valid order per user
    const firstOrderAt = new Map();
    allOrders.forEach((o) => {
      if (CANCELLED.includes(o.status)) return;
      const k = String(o.user);
      const d = new Date(o.createdAt);
      if (!firstOrderAt.has(k) || d < firstOrderAt.get(k)) firstOrderAt.set(k, d);
    });

    // Product names for items without a stored productName
    const productIds = [...new Set(orders.flatMap((o) => (o.items || []).filter((i) => !i.productName).map((i) => String(i.product))))];
    const products = productIds.length ? await Product.find({ _id: { $in: productIds } }, { name: 1 }).lean() : [];
    const productName = new Map(products.map((p) => [String(p._id), p.name]));

    /* ── Per buyer ── */
    const rows = new Map();
    users.forEach((u) => {
      rows.set(String(u._id), {
        _id: String(u._id),
        name: u.name || "—",
        companyName: u.companyName || "",
        memberId: u.memberId || "",
        email: u.email || "",
        phone: u.phone || "",
        city: u.city || "",
        state: u.state || "",
        gstNumber: u.gstNumber || "",
        joinedAt: u.createdAt || null,
        totalOrders: 0,
        cancelledOrders: 0,
        totalSales: 0,
        subtotal: 0,
        gst: 0,
        discount: 0,
        quantity: 0,
        delivered: 0,
        firstOrder: null,
        lastOrder: null,
        firstEverOrder: firstOrderAt.get(String(u._id)) || null,
        _products: new Map(),
      });
    });

    const monthMap = new Map();
    const productMap = new Map();
    const statusMap = new Map();
    const paymentMap = new Map();
    const stateMap = new Map();

    orders.forEach((o) => {
      const r = rows.get(String(o.user));
      if (!r) return;
      const d = new Date(o.createdAt);
      const cancelled = CANCELLED.includes(o.status);
      statusMap.set(o.status || "Unknown", (statusMap.get(o.status || "Unknown") || 0) + 1);

      const mk = monthOf(d);
      if (!monthMap.has(mk.key)) monthMap.set(mk.key, { ...mk, orders: 0, cancelled: 0, sales: 0, buyers: new Set(), newBuyers: new Set() });
      const m = monthMap.get(mk.key);

      if (cancelled) {
        r.cancelledOrders++;
        m.cancelled++;
        return;
      }

      const total = Number(o.total) || 0;
      r.totalOrders++;
      r.totalSales += total;
      r.subtotal += Number(o.subtotal) || 0;
      r.gst += Number(o.gstAmount) || 0;
      r.discount += Number(o.coupon?.discountAmount) || 0;
      if (DELIVERED.includes(o.status)) r.delivered++;
      if (!r.firstOrder || d < r.firstOrder) r.firstOrder = d;
      if (!r.lastOrder || d > r.lastOrder) r.lastOrder = d;

      m.orders++;
      m.sales += total;
      m.buyers.add(r._id);
      if (r.firstEverOrder && monthOf(r.firstEverOrder).key === mk.key) m.newBuyers.add(r._id);

      const pm = o.paymentMethod || "Other";
      if (!paymentMap.has(pm)) paymentMap.set(pm, { method: pm, orders: 0, sales: 0 });
      paymentMap.get(pm).orders++;
      paymentMap.get(pm).sales += total;

      const st = (r.state || o.shipping?.state || "").trim() || "Not set";
      if (!stateMap.has(st)) stateMap.set(st, { state: st, orders: 0, sales: 0, buyers: new Set() });
      const sm = stateMap.get(st);
      sm.orders++;
      sm.sales += total;
      sm.buyers.add(r._id);

      (o.items || []).forEach((i) => {
        const pid = String(i.product);
        const name = i.productName || productName.get(pid) || "Deleted product";
        const qty = Number(i.quantity) || 0;
        const value = qty * (Number(i.price) || 0);
        r.quantity += qty;
        if (!productMap.has(pid)) productMap.set(pid, { productId: pid, name, quantity: 0, value: 0, orders: 0, buyers: new Set() });
        const p = productMap.get(pid);
        p.quantity += qty;
        p.value += value;
        p.orders++;
        p.buyers.add(r._id);
        r._products.set(name, (r._products.get(name) || 0) + value);
      });
    });

    const rangeSales = [...rows.values()].reduce((s, r) => s + r.totalSales, 0);
    const buyerRows = [...rows.values()].map((r) => {
      const top = [...r._products.entries()].sort((a, b) => b[1] - a[1])[0];
      const isNew = !!(r.firstEverOrder && inRange(r.firstEverOrder));
      const { _products, ...rest } = r;
      return {
        ...rest,
        totalSales: r2(r.totalSales),
        subtotal: r2(r.subtotal),
        gst: r2(r.gst),
        discount: r2(r.discount),
        avgOrderValue: r.totalOrders ? r2(r.totalSales / r.totalOrders) : 0,
        sharePct: rangeSales ? r2((r.totalSales / rangeSales) * 100) : 0,
        topProduct: top ? top[0] : "",
        isNewBuyer: isNew && r.totalOrders > 0,
        daysSinceLastOrder: r.lastOrder ? Math.floor((Date.now() - r.lastOrder) / DAY_MS) : null,
      };
    });
    buyerRows.sort((a, b) => b.totalSales - a.totalSales || b.totalOrders - a.totalOrders || a.name.localeCompare(b.name));
    let rank = 0;
    buyerRows.forEach((r) => { r.rank = r.totalOrders ? ++rank : null; });

    /* ── Summary ── */
    const active = buyerRows.filter((r) => r.totalOrders > 0);
    const validOrders = active.reduce((s, r) => s + r.totalOrders, 0);
    const cancelledOrders = buyerRows.reduce((s, r) => s + r.cancelledOrders, 0);
    const top5Sales = active.slice(0, 5).reduce((s, r) => s + r.totalSales, 0);

    const summary = {
      totalUsers: users.length,
      buyers: active.length,
      newBuyers: active.filter((r) => r.isNewBuyer).length,
      repeatBuyers: active.filter((r) => r.totalOrders >= 2).length,
      noOrders: buyerRows.filter((r) => r.totalOrders === 0).length,
      orders: validOrders,
      cancelledOrders,
      sales: r2(rangeSales),
      subtotal: r2(active.reduce((s, r) => s + r.subtotal, 0)),
      gst: r2(active.reduce((s, r) => s + r.gst, 0)),
      discount: r2(active.reduce((s, r) => s + r.discount, 0)),
      quantity: active.reduce((s, r) => s + r.quantity, 0),
      avgOrderValue: validOrders ? r2(rangeSales / validOrders) : 0,
      avgPerBuyer: active.length ? r2(rangeSales / active.length) : 0,
      top5SharePct: rangeSales ? r2((top5Sales / rangeSales) * 100) : 0,
      prev,
    };

    /* ── Monthly trend ── */
    const orderDates = orders.map((o) => new Date(o.createdAt));
    let monthly = [];
    const spanStart = fromDate || (orderDates.length ? new Date(Math.min(...orderDates)) : null);
    const spanEnd = toDate ? new Date(Math.min(toDate.getTime() - 1, Date.now())) : new Date();
    if (spanStart && spanStart <= spanEnd) {
      monthly = monthList(spanStart, spanEnd).map((mk) => {
        const m = monthMap.get(mk.key);
        return {
          key: mk.key,
          label: mk.label,
          orders: m?.orders || 0,
          cancelled: m?.cancelled || 0,
          sales: r2(m?.sales || 0),
          buyers: m?.buyers.size || 0,
          newBuyers: m?.newBuyers.size || 0,
        };
      });
    }

    return res.status(200).json({
      userType,
      range: { from: req.query.from || null, to: req.query.to || null },
      generatedAt: new Date(),
      summary,
      // "partners" kept for older callers of this endpoint
      partners: buyerRows,
      buyers: buyerRows,
      monthly,
      products: [...productMap.values()]
        .map((p) => ({ productId: p.productId, name: p.name, quantity: p.quantity, value: r2(p.value), orders: p.orders, buyers: p.buyers.size }))
        .sort((a, b) => b.value - a.value),
      statuses: [...statusMap.entries()].map(([status, count]) => ({ status, count, cancelled: CANCELLED.includes(status) })).sort((a, b) => b.count - a.count),
      payments: [...paymentMap.values()].map((p) => ({ ...p, sales: r2(p.sales) })).sort((a, b) => b.sales - a.sales),
      states: [...stateMap.values()].map((s) => ({ state: s.state, orders: s.orders, sales: r2(s.sales), buyers: s.buyers.size })).sort((a, b) => b.sales - a.sales),
    });
  } catch (err) {
    console.error("Sales report error:", err);
    return res.status(500).json({ message: "Could not build the sales report" });
  }
}
