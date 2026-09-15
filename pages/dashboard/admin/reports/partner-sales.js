"use client";

// Sales report per buyer with two tabs: partners (B2B) and customers (B2C).
// Data: /api/admin/reports/partner-sales?userType=&from=&to=
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import {
  FiBarChart2, FiRefreshCw, FiDownload, FiSearch, FiUsers, FiShoppingBag, FiTrendingUp, FiTrendingDown,
  FiRepeat, FiUserPlus, FiPercent, FiAlertTriangle, FiChevronUp, FiChevronDown, FiBriefcase, FiUser, FiMapPin,
} from "react-icons/fi";

/* ── Formatting ──────────────────────────────────────────────────────────── */
const TZ = "Asia/Kolkata";
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const inrShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return inr(v);
};
const num = (n) => Number(n || 0).toLocaleString("en-IN");
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ }) : "—");
const pad = (n) => String(n).padStart(2, "0");

function istToday() {
  const x = new Date(Date.now() + 330 * 60000);
  return [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()];
}
const ymd = (y, m, d) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

const PRESETS = [
  { key: "all", label: "All time" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "3m", label: "Last 3 months" },
  { key: "6m", label: "Last 6 months" },
  { key: "fy", label: "This FY" },
  { key: "last_fy", label: "Last FY" },
];
function presetRange(key) {
  const [y, m, d] = istToday();
  const today = ymd(y, m, d);
  const fyStart = m >= 4 ? y : y - 1;
  switch (key) {
    case "this_month": return { from: ymd(y, m, 1), to: today };
    case "last_month": return { from: ymd(y, m - 1, 1), to: ymd(y, m, 0) };
    case "3m": return { from: ymd(y, m - 2, 1), to: today };
    case "6m": return { from: ymd(y, m - 5, 1), to: today };
    case "fy": return { from: ymd(fyStart, 4, 1), to: today };
    case "last_fy": return { from: ymd(fyStart - 1, 4, 1), to: ymd(fyStart, 3, 31) };
    default: return { from: "", to: "" };
  }
}

const TYPES = {
  partner: { label: "Partners", short: "Partner", tag: "B2B", icon: <FiBriefcase size={14} /> },
  customer: { label: "Customers", short: "Customer", tag: "B2C", icon: <FiUser size={14} /> },
};

const BUYER_FILTERS = [
  { key: "all", label: "All" },
  { key: "ordered", label: "Ordered" },
  { key: "new", label: "New buyers" },
  { key: "repeat", label: "Repeat buyers" },
  { key: "none", label: "No orders" },
];

const PAGE_SIZE = 15;

/* ── Small pieces ────────────────────────────────────────────────────────── */
function Delta({ cur, prev }) {
  if (prev == null) return null;
  if (!prev && !cur) return <span style={{ ...S.delta, background: "#f3f4f6", color: "#6b7280" }}>No change</span>;
  if (!prev) return <span style={{ ...S.delta, background: "#dcfce7", color: "#166534" }}>New</span>;
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span style={{ ...S.delta, background: up ? "#dcfce7" : "#fee2e2", color: up ? "#166534" : "#991b1b" }}>
      {up ? <FiTrendingUp size={11} /> : <FiTrendingDown size={11} />} {Math.abs(pct).toFixed(0)}%
      <span style={{ fontWeight: 500, opacity: 0.8 }}>vs previous</span>
    </span>
  );
}

function Kpi({ icon, tint, label, value, sub, children }) {
  return (
    <div style={S.kpi}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ ...S.kpiIcon, background: tint[0], color: tint[1] }}>{icon}</span>
        <span style={S.kpiLabel}>{label}</span>
      </div>
      <div style={S.kpiValue}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b7280" }}>{sub}</div>}
      {children}
    </div>
  );
}

function Empty({ title, text }) {
  return (
    <div style={S.empty}>
      <div style={{ fontWeight: 700, color: "#4b5563", marginBottom: 4 }}>{title}</div>
      <div>{text}</div>
    </div>
  );
}

function BarList({ rows, labelKey, valueKey, format, sub, color = "#6366f1", limit = 8 }) {
  const shown = rows.slice(0, limit);
  const max = Math.max(1, ...shown.map((r) => r[valueKey] || 0));
  return (
    <div style={{ display: "grid", gap: 11 }}>
      {shown.map((r, i) => (
        <div key={`${r[labelKey]}-${i}`} style={{ minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r[labelKey]}</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: "#374151", whiteSpace: "nowrap" }}>{format(r[valueKey])}</span>
          </div>
          <div style={{ height: 8, background: "#f1f2f6", borderRadius: 6, overflow: "hidden" }}>
            <div style={{ width: `${((r[valueKey] || 0) / max) * 100}%`, height: "100%", background: color, borderRadius: 6 }} />
          </div>
          {sub && <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 3 }}>{sub(r)}</div>}
        </div>
      ))}
    </div>
  );
}

function TrendChart({ monthly }) {
  const [hover, setHover] = useState(null);
  const H = 180;
  const max = Math.max(1, ...monthly.map((m) => m.sales));
  const nice = (() => {
    const p = Math.pow(10, Math.floor(Math.log10(max)));
    const f = max / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  })();
  const ticks = [nice, nice * 0.75, nice * 0.5, nice * 0.25, 0];
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", minWidth: Math.max(monthly.length * 52, 300) }}>
        <div style={{ position: "relative", width: 54, height: H, flexShrink: 0 }}>
          {ticks.map((t) => (
            <span key={t} style={{ position: "absolute", right: 8, top: H - (t / nice) * H - 7, fontSize: 10.5, color: "#9ca3af", fontVariantNumeric: "tabular-nums" }}>{inrShort(t)}</span>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ position: "relative", height: H, borderBottom: "1px solid #e5e7eb" }}>
            {ticks.slice(0, -1).map((t) => (
              <div key={t} style={{ position: "absolute", left: 0, right: 0, top: H - (t / nice) * H, borderTop: "1px dashed #eef0f3" }} />
            ))}
            <div style={{ position: "absolute", inset: 0, display: "flex" }}>
              {monthly.map((m) => (
                <div
                  key={m.key}
                  onMouseEnter={() => setHover(m.key)}
                  onMouseLeave={() => setHover(null)}
                  style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", background: hover === m.key ? "rgba(99,102,241,.05)" : "transparent" }}
                >
                  <div style={{ width: "55%", maxWidth: 30, height: `${(m.sales / nice) * 100}%`, minHeight: m.sales ? 3 : 0, background: "#6366f1", borderRadius: "4px 4px 0 0" }} />
                  {hover === m.key && (
                    <div style={{ ...S.tooltip, bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6 }}>
                      <strong>{m.label}</strong><br />
                      Sales: {inr(m.sales)}<br />
                      Orders: {num(m.orders)}{m.cancelled ? ` (+${m.cancelled} cancelled)` : ""}<br />
                      Buyers: {num(m.buyers)}{m.newBuyers ? ` (${m.newBuyers} new)` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex" }}>
            {monthly.map((m) => (
              <div key={m.key} style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#6b7280", paddingTop: 6, whiteSpace: "nowrap" }}>
                {m.label.replace(" 20", " '")}
                <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{m.orders} ord.</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function SalesReport() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [type, setType] = useState("partner");
  const [preset, setPreset] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("all");
  const [sort, setSort] = useState({ key: "totalSales", dir: "desc" });
  const [page, setPage] = useState(1);

  // Tab is read once from ?type= so a link can open the customers tab directly
  const [urlSynced, setUrlSynced] = useState(false);
  useEffect(() => {
    if (!router.isReady || urlSynced) return;
    if (router.query.type === "customer") setType("customer");
    setUrlSynced(true);
  }, [router.isReady, urlSynced, router.query.type]);

  const switchType = (t) => {
    if (t === type) return;
    setType(t);
    setReport(null);
    setSearch("");
    setBuyerFilter("all");
    setPage(1);
    router.replace({ pathname: router.pathname, query: t === "customer" ? { type: t } : {} }, undefined, { shallow: true });
  };

  useEffect(() => {
    if (!urlSynced) return;
    if (from && to && from > to) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    axios
      .get("/api/admin/reports/partner-sales", { params: { userType: type, from: from || undefined, to: to || undefined }, withCredentials: true })
      .then((res) => { if (!cancelled) { setReport(res.data); setPage(1); } })
      .catch((err) => {
        if (cancelled) return;
        const msg = err?.response?.data?.message || "Could not load the sales report";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [type, from, to, reloadKey, urlSynced]);

  const applyPreset = (key) => {
    const r = presetRange(key);
    setPreset(key);
    setFrom(r.from);
    setTo(r.to);
  };

  const T = TYPES[type];
  const s = report?.summary;
  const buyers = report?.buyers || [];

  const counts = useMemo(() => ({
    all: buyers.length,
    ordered: buyers.filter((b) => b.totalOrders > 0).length,
    new: buyers.filter((b) => b.isNewBuyer).length,
    repeat: buyers.filter((b) => b.totalOrders >= 2).length,
    none: buyers.filter((b) => b.totalOrders === 0).length,
  }), [buyers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = buyers.filter((b) => {
      if (buyerFilter === "ordered" && !b.totalOrders) return false;
      if (buyerFilter === "new" && !b.isNewBuyer) return false;
      if (buyerFilter === "repeat" && b.totalOrders < 2) return false;
      if (buyerFilter === "none" && b.totalOrders) return false;
      if (!q) return true;
      return [b.name, b.companyName, b.memberId, b.email, b.phone, b.city, b.state].some((v) => String(v || "").toLowerCase().includes(q));
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (sort.key === "name") return dir * String(av).localeCompare(String(bv));
      if (sort.key === "lastOrder") return dir * ((av ? new Date(av).getTime() : 0) - (bv ? new Date(bv).getTime() : 0));
      return dir * ((av || 0) - (bv || 0)) || b.totalSales - a.totalSales;
    });
  }, [buyers, search, buyerFilter, sort]);

  const setSortKey = (key) => setSort((cur) => (cur.key === key ? { key, dir: cur.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "name" ? "asc" : "desc" }));

  const rangeText = from || to ? `${from ? day(from) : "Start"} – ${to ? day(to) : "Today"}` : "All time";
  const detailHref = (b) => ({ pathname: `/dashboard/admin/reports/partner-sales/${b._id}`, query: { ...(from ? { from } : {}), ...(to ? { to } : {}), type } });

  /* ── Excel ── */
  const exportExcel = () => {
    if (!report) return;
    try {
      const wb = XLSX.utils.book_new();
      const add = (name, rows, widths) => {
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No data for this period" }]);
        if (widths) ws["!cols"] = widths.map((w) => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      add("Summary", [
        { Metric: "Report", Value: `${T.label} (${T.tag}) sales` },
        { Metric: "Period", Value: rangeText },
        { Metric: "Generated on", Value: new Date().toLocaleString("en-IN", { timeZone: TZ }) },
        { Metric: `Total ${T.label.toLowerCase()}`, Value: s.totalUsers },
        { Metric: `${T.label} who ordered`, Value: s.buyers },
        { Metric: "New buyers", Value: s.newBuyers },
        { Metric: "Repeat buyers (2+ orders)", Value: s.repeatBuyers },
        { Metric: "Orders (excluding cancelled)", Value: s.orders },
        { Metric: "Cancelled / rejected orders", Value: s.cancelledOrders },
        { Metric: "Total sales (₹)", Value: s.sales },
        { Metric: "Subtotal before GST and discount (₹)", Value: s.subtotal },
        { Metric: "GST (₹)", Value: s.gst },
        { Metric: "Coupon discount (₹)", Value: s.discount },
        { Metric: "Units sold", Value: s.quantity },
        { Metric: "Average order value (₹)", Value: s.avgOrderValue },
        { Metric: "Average sales per buyer (₹)", Value: s.avgPerBuyer },
        { Metric: "Top 5 buyers share (%)", Value: s.top5SharePct },
      ], [38, 30]);

      add(T.label, filtered.map((b) => ({
        Rank: b.rank || "",
        Name: b.name,
        Company: b.companyName,
        "Member ID": b.memberId,
        Email: b.email,
        Phone: b.phone,
        City: b.city,
        State: b.state,
        GSTIN: b.gstNumber,
        Orders: b.totalOrders,
        "Cancelled orders": b.cancelledOrders,
        "Units bought": b.quantity,
        "Subtotal (₹)": b.subtotal,
        "GST (₹)": b.gst,
        "Discount (₹)": b.discount,
        "Total sales (₹)": b.totalSales,
        "Avg order value (₹)": b.avgOrderValue,
        "Share of sales (%)": b.sharePct,
        "Top product": b.topProduct,
        "First order": b.firstOrder ? day(b.firstOrder) : "",
        "Last order": b.lastOrder ? day(b.lastOrder) : "",
        "Days since last order": b.daysSinceLastOrder ?? "",
        "New buyer": b.isNewBuyer ? "Yes" : "No",
        Joined: b.joinedAt ? day(b.joinedAt) : "",
      })), [6, 22, 24, 12, 26, 14, 14, 14, 18, 8, 10, 10, 12, 10, 10, 14, 14, 10, 26, 13, 13, 10, 9, 13]);

      add("Monthly", report.monthly.map((m) => ({
        Month: m.label, Orders: m.orders, "Cancelled orders": m.cancelled, "Sales (₹)": m.sales, Buyers: m.buyers, "New buyers": m.newBuyers,
      })), [12, 8, 10, 14, 8, 10]);

      add("Products", report.products.map((p) => ({
        Product: p.name, "Units sold": p.quantity, "Value before GST (₹)": p.value, Orders: p.orders, Buyers: p.buyers,
      })), [34, 10, 18, 8, 8]);

      add("States", report.states.map((x) => ({ State: x.state, Buyers: x.buyers, Orders: x.orders, "Sales (₹)": x.sales })), [20, 8, 8, 14]);
      add("Order status", report.statuses.map((x) => ({ Status: x.status, Orders: x.count, "Counted in sales": x.cancelled ? "No" : "Yes" })), [20, 8, 14]);

      const [y, m, d] = istToday();
      XLSX.writeFile(wb, `${type}-sales-report_${y}-${pad(m)}-${pad(d)}.xlsx`);
      toast.success("Excel downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Could not create the Excel file");
    }
  };

  const SortTh = ({ k, children, align = "right" }) => (
    <th style={{ ...S.th, textAlign: align, cursor: "pointer", userSelect: "none" }} onClick={() => setSortKey(k)} aria-sort={sort.key === k ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        {children}
        {sort.key === k ? (sort.dir === "asc" ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />) : null}
      </span>
    </th>
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area" style={{ flex: 1, minWidth: 0, background: "#f6f7fb" }}>
        <nav style={S.topbar}>
          <button type="button" onClick={() => setSidebarOpen((v) => !v)} style={S.burger} aria-label="Toggle sidebar">☰</button>
          <FiBarChart2 size={18} style={{ marginRight: 8, color: "#6366f1", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>Sales Report</div>
            <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{T.label} ({T.tag}) · {rangeText}</div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} style={S.ghostBtn} aria-label="Refresh" title="Refresh" disabled={loading}>
              <FiRefreshCw size={14} style={loading ? { animation: "psr2-spin 1s linear infinite" } : undefined} />
            </button>
            <button type="button" onClick={exportExcel} disabled={!report || loading} style={{ ...S.exportBtn, opacity: !report || loading ? 0.6 : 1 }}>
              <FiDownload size={14} /> <span className="psr2-hide-xs">Export Excel</span>
            </button>
          </div>
        </nav>

        <div style={S.body}>
          {/* Tabs */}
          <div style={S.tabs} role="tablist">
            {Object.entries(TYPES).map(([key, t]) => (
              <button key={key} type="button" role="tab" aria-selected={type === key} onClick={() => switchType(key)} style={{ ...S.tab, ...(type === key ? S.tabOn : {}) }}>
                {t.icon} {t.label} <span style={{ ...S.tabTag, ...(type === key ? { background: "#eef2ff", color: "#4f46e5" } : {}) }}>{t.tag}</span>
              </button>
            ))}
          </div>

          {/* Period */}
          <section style={S.panel}>
            <div style={S.presetRow}>
              {PRESETS.map((p) => (
                <button key={p.key} type="button" onClick={() => applyPreset(p.key)} style={{ ...S.chip, ...(preset === p.key ? S.chipOn : {}) }}>{p.label}</button>
              ))}
              <button type="button" onClick={() => setPreset("custom")} style={{ ...S.chip, ...(preset === "custom" ? S.chipOn : {}) }}>Custom</button>
            </div>
            <div style={S.filterGrid}>
              <label style={S.field}>
                <span style={S.fieldLabel}>From</span>
                <input id="sr-from" type="date" style={S.input} value={from} max={to || undefined} onChange={(e) => { setPreset("custom"); setFrom(e.target.value); }} />
              </label>
              <label style={S.field}>
                <span style={S.fieldLabel}>To</span>
                <input id="sr-to" type="date" style={S.input} value={to} min={from || undefined} onChange={(e) => { setPreset("custom"); setTo(e.target.value); }} />
              </label>
            </div>
            {from && to && from > to && <div style={{ color: "#b91c1c", fontSize: 12.5, marginTop: 8 }}>From date must be before To date.</div>}
          </section>

          {error && !report && (
            <section style={{ ...S.panel, borderColor: "#fecaca", background: "#fff5f5", display: "flex", gap: 10, alignItems: "center" }}>
              <FiAlertTriangle color="#dc2626" /> <span style={{ flex: 1 }}>{error}</span>
              <button type="button" style={S.ghostBtn} onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
            </section>
          )}

          {!report && loading && (
            <div style={S.kpiGrid}>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ ...S.kpi, height: 110 }} className="psr2-skeleton" />)}</div>
          )}

          {report && (
            <div style={{ display: "grid", gap: 18, opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
              <div style={S.kpiGrid}>
                <Kpi icon={<FiTrendingUp size={15} />} tint={["#eef2ff", "#4f46e5"]} label="Total sales" value={inr(s.sales)} sub={`GST ${inr(s.gst)}${s.discount ? ` · discount ${inr(s.discount)}` : ""}`}>
                  <Delta cur={s.sales} prev={s.prev?.sales} />
                </Kpi>
                <Kpi icon={<FiShoppingBag size={15} />} tint={["#ecfeff", "#0e7490"]} label="Orders" value={num(s.orders)} sub={s.cancelledOrders ? `${num(s.cancelledOrders)} cancelled, not counted` : `${num(s.quantity)} units sold`}>
                  <Delta cur={s.orders} prev={s.prev?.orders} />
                </Kpi>
                <Kpi icon={<FiUsers size={15} />} tint={["#dcfce7", "#15803d"]} label={`${T.label} who ordered`} value={`${num(s.buyers)} / ${num(s.totalUsers)}`} sub={`${num(s.noOrders)} with no orders in this period`}>
                  <Delta cur={s.buyers} prev={s.prev?.buyers} />
                </Kpi>
                <Kpi icon={<FiPercent size={15} />} tint={["#fef3c7", "#b45309"]} label="Average order value" value={inr(s.avgOrderValue)} sub={`${inr(s.avgPerBuyer)} per buyer`} />
                <Kpi icon={<FiUserPlus size={15} />} tint={["#f3e8ff", "#7e22ce"]} label="New buyers" value={num(s.newBuyers)} sub="First ever order in this period" />
                <Kpi icon={<FiRepeat size={15} />} tint={["#fee2e2", "#b91c1c"]} label="Repeat buyers" value={num(s.repeatBuyers)} sub={s.buyers ? `${Math.round((s.repeatBuyers / s.buyers) * 100)}% ordered 2+ times · top 5 = ${s.top5SharePct}% of sales` : "No orders yet"} />
              </div>

              <div style={S.twoCol}>
                <section style={S.panel}>
                  <div style={S.panelHead}>
                    <div>
                      <h3 style={S.panelTitle}>Sales by month</h3>
                      <div style={S.panelSub}>Hover a month for orders and buyers.</div>
                    </div>
                  </div>
                  {report.monthly.length && s.orders ? <TrendChart monthly={report.monthly} /> : <Empty title="No sales yet" text="There are no orders in this period." />}
                </section>
                <section style={S.panel}>
                  <div style={S.panelHead}>
                    <div>
                      <h3 style={S.panelTitle}>Top products</h3>
                      <div style={S.panelSub}>Value before GST and discount.</div>
                    </div>
                  </div>
                  {report.products.length ? (
                    <BarList rows={report.products} labelKey="name" valueKey="value" format={inr} sub={(p) => `${num(p.quantity)} units · ${num(p.buyers)} buyer${p.buyers === 1 ? "" : "s"}`} />
                  ) : <Empty title="No products" text="Nothing sold in this period." />}
                </section>
              </div>

              <div style={S.twoCol}>
                <section style={S.panel}>
                  <div style={S.panelHead}>
                    <div>
                      <h3 style={S.panelTitle}><FiMapPin size={14} style={{ verticalAlign: -2 }} /> Sales by state</h3>
                      <div style={S.panelSub}>From the buyer profile, or the shipping address when missing.</div>
                    </div>
                  </div>
                  {report.states.length ? (
                    <BarList rows={report.states} labelKey="state" valueKey="sales" format={inr} color="#0ea5e9" sub={(x) => `${num(x.orders)} orders · ${num(x.buyers)} buyers`} />
                  ) : <Empty title="No data" text="Nothing sold in this period." />}
                </section>
                <section style={S.panel}>
                  <div style={S.panelHead}>
                    <div>
                      <h3 style={S.panelTitle}>Orders by status</h3>
                      <div style={S.panelSub}>Cancelled and rejected orders are left out of sales.</div>
                    </div>
                  </div>
                  {report.statuses.length ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {report.statuses.map((x) => (
                        <span key={x.status} style={{ ...S.statusPill, ...(x.cancelled ? { background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" } : {}) }}>
                          {x.status} <strong style={{ fontVariantNumeric: "tabular-nums" }}>{num(x.count)}</strong>
                        </span>
                      ))}
                    </div>
                  ) : <Empty title="No orders" text="Nothing to show for this period." />}
                  {report.payments.length > 0 && (
                    <>
                      <h4 style={{ ...S.subHead, marginTop: 18 }}>Payment method</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {report.payments.map((p) => (
                          <span key={p.method} style={S.statusPill}>{p.method} <strong>{num(p.orders)}</strong> <span style={{ color: "#6b7280" }}>{inr(p.sales)}</span></span>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              </div>

              {/* Buyers table */}
              <section style={S.panel}>
                <div style={S.panelHead}>
                  <div>
                    <h3 style={S.panelTitle}>{T.short} ranking</h3>
                    <div style={S.panelSub}>Click a {T.short.toLowerCase()} to see every order. Click a column heading to sort.</div>
                  </div>
                  <div style={{ position: "relative" }}>
                    <FiSearch size={14} style={{ position: "absolute", left: 10, top: 12, color: "#9ca3af" }} />
                    <input
                      id="sr-search"
                      style={{ ...S.input, paddingLeft: 30, width: 280 }}
                      placeholder={type === "partner" ? "Name, company, member ID, phone" : "Name, email, phone, city"}
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                  </div>
                </div>

                <div style={{ ...S.presetRow, borderBottom: "none", marginBottom: 6 }}>
                  {BUYER_FILTERS.map((f) => (
                    <button key={f.key} type="button" onClick={() => { setBuyerFilter(f.key); setPage(1); }} style={{ ...S.chip, ...(buyerFilter === f.key ? S.chipOn : {}) }}>
                      {f.label} <span style={{ opacity: 0.7, marginLeft: 3 }}>{counts[f.key]}</span>
                    </button>
                  ))}
                </div>

                {filtered.length === 0 ? (
                  <Empty title={`No ${T.label.toLowerCase()} found`} text={buyers.length ? "Try another search or filter." : `There are no registered ${T.label.toLowerCase()} yet.`} />
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={{ ...S.th, textAlign: "center", width: 50 }}>Rank</th>
                            <SortTh k="name" align="left">{T.short}</SortTh>
                            <th style={{ ...S.th, textAlign: "left" }}>Contact</th>
                            <SortTh k="totalOrders">Orders</SortTh>
                            <SortTh k="totalSales">Sales</SortTh>
                            <SortTh k="sharePct">Share</SortTh>
                            <SortTh k="avgOrderValue">Avg order</SortTh>
                            <SortTh k="lastOrder" align="left">Last order</SortTh>
                            <th style={{ ...S.th, textAlign: "left" }}>Top product</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((b) => (
                            <tr key={b._id} className="psr2-row" style={{ cursor: "pointer" }} onClick={() => router.push(detailHref(b))}>
                              <td style={{ ...S.td, textAlign: "center" }}>
                                {b.rank ? <span style={{ ...S.rank, ...(b.rank <= 3 ? S.rankTop : {}) }}>{b.rank}</span> : <span style={{ color: "#c7cbd4" }}>—</span>}
                              </td>
                              <td style={S.td}>
                                <Link href={detailHref(b)} style={S.link} onClick={(e) => e.stopPropagation()}>{b.name}</Link>
                                <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                                  {[b.companyName, b.memberId, [b.city, b.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
                                </div>
                                <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                                  {b.isNewBuyer && <span style={{ ...S.badge, background: "#f3e8ff", color: "#7e22ce" }}>New</span>}
                                  {b.totalOrders >= 2 && <span style={{ ...S.badge, background: "#dcfce7", color: "#166534" }}>Repeat</span>}
                                </div>
                              </td>
                              <td style={{ ...S.td, fontSize: 12 }}>
                                <div>{b.phone || "—"}</div>
                                <div style={{ color: "#6b7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.email}</div>
                              </td>
                              <td style={S.tdNum}>
                                <div style={{ fontWeight: 700, color: "#111827" }}>{num(b.totalOrders)}</div>
                                {b.cancelledOrders > 0 && <div style={{ fontSize: 11.5, color: "#b91c1c" }}>+{b.cancelledOrders} cancelled</div>}
                              </td>
                              <td style={{ ...S.tdNum, fontWeight: 700, color: "#111827" }}>{inr(b.totalSales)}</td>
                              <td style={S.tdNum}>
                                <div>{b.sharePct}%</div>
                                <div style={{ marginTop: 4, marginLeft: "auto", width: 64, height: 5, background: "#f1f2f6", borderRadius: 4, overflow: "hidden" }}>
                                  <div style={{ width: `${Math.min(100, b.sharePct)}%`, height: "100%", background: "#6366f1" }} />
                                </div>
                              </td>
                              <td style={S.tdNum}>{b.totalOrders ? inr(b.avgOrderValue) : "—"}</td>
                              <td style={S.td}>
                                {b.lastOrder ? (
                                  <>
                                    <div style={{ whiteSpace: "nowrap" }}>{day(b.lastOrder)}</div>
                                    <div style={{ fontSize: 11.5, color: b.daysSinceLastOrder > 60 ? "#b45309" : "#6b7280" }}>{b.daysSinceLastOrder === 0 ? "today" : `${b.daysSinceLastOrder} days ago`}</div>
                                  </>
                                ) : <span style={{ color: "#9ca3af" }}>No orders</span>}
                              </td>
                              <td style={{ ...S.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={b.topProduct}>{b.topProduct || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                        {filtered.some((b) => b.totalOrders) && (
                          <tfoot>
                            <tr>
                              <td style={{ ...S.td, fontWeight: 700 }} colSpan={3}>Total ({num(filtered.length)} {T.label.toLowerCase()})</td>
                              <td style={{ ...S.tdNum, fontWeight: 700 }}>{num(filtered.reduce((a, b) => a + b.totalOrders, 0))}</td>
                              <td style={{ ...S.tdNum, fontWeight: 700 }}>{inr(filtered.reduce((a, b) => a + b.totalSales, 0))}</td>
                              <td style={S.td} colSpan={4} />
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                    {filtered.length > PAGE_SIZE && (
                      <div style={S.pager}>
                        <span style={{ color: "#6b7280" }}>{num((page - 1) * PAGE_SIZE + 1)}–{num(Math.min(page * PAGE_SIZE, filtered.length))} of {num(filtered.length)}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <button type="button" style={{ ...S.pageBtn, opacity: page <= 1 ? 0.5 : 1 }} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                          <span>Page {page} of {pages}</span>
                          <button type="button" style={{ ...S.pageBtn, opacity: page >= pages ? 0.5 : 1 }} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes psr2-spin { to { transform: rotate(360deg); } }
        @keyframes psr2-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
        .psr2-skeleton { background: linear-gradient(90deg, #eef0f3, #f6f7fb, #eef0f3) !important; animation: psr2-pulse 1.4s ease-in-out infinite; }
        .psr2-row:hover td { background: #f8f9ff; }
        @media (max-width: 640px) { .psr2-hide-xs { display: none; } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      `}</style>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const S = {
  topbar: { background: "#fff", borderBottom: "1px solid #eee", padding: "0 20px", minHeight: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100, gap: 4 },
  burger: { background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 12, flexShrink: 0 },
  body: { padding: "20px clamp(12px, 2.5vw, 24px)", display: "grid", gap: 18 },
  panel: { background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(15,23,42,0.06)", border: "1px solid #eef0f3", minWidth: 0 },
  panelHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  panelTitle: { margin: 0, fontSize: 15.5, fontWeight: 700, color: "#111827" },
  panelSub: { fontSize: 12.5, color: "#6b7280", marginTop: 3 },
  subHead: { margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: ".05em" },

  tabs: { display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", overflowX: "auto" },
  tab: { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", border: "none", borderBottom: "2px solid transparent", background: "transparent", fontSize: 14, fontWeight: 600, color: "#6b7280", cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1 },
  tabOn: { color: "#4f46e5", borderBottomColor: "#6366f1" },
  tabTag: { fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "#f1f2f6", color: "#6b7280" },

  presetRow: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #f1f2f6" },
  chip: { flexShrink: 0, padding: "6px 12px", borderRadius: 20, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12.5, fontWeight: 600, color: "#374151", cursor: "pointer" },
  chipOn: { background: "#6366f1", borderColor: "#6366f1", color: "#fff" },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em" },
  input: { height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 10px", fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box", minWidth: 0, width: "100%", maxWidth: "100%" },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 },
  kpi: { background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(15,23,42,0.06)", display: "grid", gap: 6, minWidth: 0, alignContent: "start" },
  kpiLabel: { fontSize: 12.5, color: "#6b7280", fontWeight: 600 },
  kpiIcon: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, flexShrink: 0 },
  kpiValue: { fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", color: "#111827" },
  delta: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", justifySelf: "start" },

  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: 18 },
  tooltip: { position: "absolute", zIndex: 5, background: "#111827", color: "#fff", fontSize: 12, lineHeight: 1.55, padding: "9px 11px", borderRadius: 8, whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 6px 18px rgba(0,0,0,.18)" },
  statusPill: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "5px 11px", borderRadius: 20, border: "1px solid #e5e7eb", background: "#fafbfc", color: "#374151" },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "right", padding: "10px 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "#6b7280", borderBottom: "1px solid #eef0f3", background: "#f9fafb", whiteSpace: "nowrap", fontWeight: 700 },
  td: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle", color: "#374151" },
  tdNum: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#374151" },
  badge: { display: "inline-block", fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 20 },
  rank: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 26, height: 26, borderRadius: 13, background: "#f1f2f6", color: "#374151", fontWeight: 700, fontSize: 12 },
  rankTop: { background: "#6366f1", color: "#fff" },
  link: { color: "#4f46e5", fontWeight: 700, textDecoration: "none" },
  empty: { padding: "28px 12px", textAlign: "center", color: "#9ca3af", fontSize: 13 },
  pager: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12, fontSize: 12.5 },
  pageBtn: { height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12.5 },
  ghostBtn: { height: 36, padding: "0 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#374151", display: "inline-flex", alignItems: "center", gap: 6 },
  exportBtn: { height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 },
};
