// pages/dashboard/admin/reports/product-sales.js
// Product sales report — which products sell, when, to whom, and how that compares with the previous period.
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import {
  FiBarChart2, FiDownload, FiSearch, FiX, FiTrendingUp, FiTrendingDown, FiAward, FiCalendar,
  FiPackage, FiUsers, FiShoppingBag, FiLayers, FiAlertTriangle, FiRefreshCw, FiExternalLink, FiChevronUp, FiChevronDown,
} from "react-icons/fi";

/* ── Constants ───────────────────────────────────────────────────────────── */
const PRESETS = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "3m", label: "Last 3 months" },
  { key: "6m", label: "Last 6 months" },
  { key: "12m", label: "Last 12 months" },
  { key: "this_fy", label: "This FY" },
  { key: "last_fy", label: "Last FY" },
  { key: "this_year", label: "This year" },
  { key: "all", label: "All time" },
];

const STATUS_OPTIONS = [
  { value: "valid", label: "Confirmed sales (excl. cancelled)" },
  { value: "delivered", label: "Delivered only" },
  { value: "in_progress", label: "In progress (not delivered)" },
  { value: "cancelled", label: "Cancelled / Rejected" },
  { value: "all", label: "All orders" },
];

const STATUS_COLORS = {
  "Order Delivered": ["#dcfce7", "#166534"], Delivered: ["#dcfce7", "#166534"],
  Cancelled: ["#fee2e2", "#991b1b"], Rejected: ["#fee2e2", "#991b1b"], "Design Rejected": ["#fee2e2", "#b91c1c"],
  "Order Dispatched": ["#e0f2fe", "#075985"], Shipped: ["#e0f2fe", "#075985"],
  "In Progress": ["#fef3c7", "#92400e"], Printing: ["#fef3c7", "#92400e"], Processing: ["#fef3c7", "#92400e"],
  "Design Approved": ["#ede9fe", "#5b21b6"], "Order Ready": ["#ede9fe", "#5b21b6"], "In Packaging": ["#ede9fe", "#5b21b6"],
};

const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7", "#14b8a6", "#f97316", "#64748b", "#ec4899"];

const DEFAULT_FILTERS = {
  preset: "12m", from: "", to: "", groupBy: "month", status: "valid", userType: "",
  category: "", product: "", paymentMethod: "", paymentStatus: "", state: "", search: "",
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const DAY = 86400000;
const ymd = (d) => d.toISOString().slice(0, 10);

function presetRange(key) {
  const n = new Date(Date.now() + 330 * 60000); // IST wall clock read via getUTC*
  const y = n.getUTCFullYear(), m = n.getUTCMonth(), d = n.getUTCDate();
  const D = (yy, mm, dd) => ymd(new Date(Date.UTC(yy, mm, dd)));
  const today = D(y, m, d);
  switch (key) {
    case "today": return [today, today];
    case "7d": return [D(y, m, d - 6), today];
    case "30d": return [D(y, m, d - 29), today];
    case "this_month": return [D(y, m, 1), today];
    case "last_month": return [D(y, m - 1, 1), D(y, m, 0)];
    case "3m": return [D(y, m - 2, 1), today];
    case "6m": return [D(y, m - 5, 1), today];
    case "12m": return [D(y, m - 11, 1), today];
    case "this_fy": { const fy = m >= 3 ? y : y - 1; return [D(fy, 3, 1), today]; }
    case "last_fy": { const fy = m >= 3 ? y - 1 : y - 2; return [D(fy, 3, 1), D(fy + 1, 2, 31)]; }
    case "this_year": return [D(y, 0, 1), today];
    default: return ["", ""];
  }
}

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const money0 = (n) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
const num = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
function compact(n) {
  const v = Number(n || 0), a = Math.abs(v);
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(a >= 1e8 ? 0 : 1)}Cr`;
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L`;
  if (a >= 1e3) return `₹${(v / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`;
  return `₹${Math.round(v)}`;
}
const compactNum = (n) => {
  const v = Number(n || 0), a = Math.abs(v);
  if (a >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(Math.round(v * 100) / 100);
};
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—");
const dayTime = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "—");
const pct = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? null : 0);
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

/* ── Small UI pieces ─────────────────────────────────────────────────────── */
function Panel({ title, subtitle, right, children, style }) {
  return (
    <section style={{ ...S.panel, ...style }}>
      {(title || right) && (
        <header style={S.panelHead}>
          <div style={{ minWidth: 0 }}>
            <h3 style={S.panelTitle}>{title}</h3>
            {subtitle && <div style={S.panelSub}>{subtitle}</div>}
          </div>
          {right && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{right}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

function Delta({ value, suffix = "vs previous period", invert = false }) {
  if (value === undefined) return null;
  if (value === null) return <span style={{ ...S.delta, background: "#e0e7ff", color: "#3730a3" }}>New {suffix && <span style={S.deltaSuffix}>{suffix}</span>}</span>;
  const good = invert ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? FiTrendingUp : FiTrendingDown;
  return (
    <span style={{ ...S.delta, background: good ? "#dcfce7" : "#fee2e2", color: good ? "#15803d" : "#b91c1c" }}>
      <Icon size={11} /> {Math.abs(value).toFixed(1)}% {suffix && <span style={S.deltaSuffix}>{suffix}</span>}
    </span>
  );
}

function Kpi({ label, value, sub, delta, color, icon: Icon, invert }) {
  return (
    <div style={{ ...S.kpi, borderLeft: `4px solid ${color}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={S.kpiLabel}>{label}</span>
        {Icon && <span style={{ ...S.kpiIcon, background: `${color}1a`, color }}><Icon size={14} /></span>}
      </div>
      <div style={{ ...S.kpiValue, color: "#111827" }}>{value}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", minHeight: 20 }}>
        {delta !== undefined && <Delta value={delta} suffix="" invert={invert} />}
        {sub && <span style={{ fontSize: 12, color: "#6b7280" }}>{sub}</span>}
      </div>
    </div>
  );
}

function Toggle({ value, onChange, options }) {
  return (
    <div style={S.toggle} role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} style={{ ...S.toggleBtn, ...(value === o.value ? S.toggleOn : {}) }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const [bg, color] = STATUS_COLORS[status] || ["#f3f4f6", "#374151"];
  return <span style={{ ...S.badge, background: bg, color }}>{status}</span>;
}

function TypeBadge({ type }) {
  if (type === "B2B") return <span style={{ ...S.badge, background: "#dbeafe", color: "#1d4ed8" }}>B2B</span>;
  if (type === "B2C") return <span style={{ ...S.badge, background: "#dcfce7", color: "#15803d" }}>B2C</span>;
  return <span style={{ ...S.badge, background: "#f3f4f6", color: "#6b7280" }}>—</span>;
}

function Empty({ text = "No sales match these filters." }) {
  return <div style={S.empty}>{text}</div>;
}

function SortTh({ label, k, sort, setSort, align = "right" }) {
  const on = sort.key === k;
  return (
    <th
      style={{ ...S.th, textAlign: align, cursor: "pointer", userSelect: "none", color: on ? "#111827" : S.th.color }}
      onClick={() => setSort((s) => ({ key: k, dir: s.key === k && s.dir === "desc" ? "asc" : "desc" }))}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        {label}
        {on ? (sort.dir === "desc" ? <FiChevronDown size={12} /> : <FiChevronUp size={12} />) : null}
      </span>
    </th>
  );
}

function Pager({ page, pages, setPage, total, per }) {
  if (pages <= 1) return null;
  return (
    <div style={S.pager}>
      <span style={{ color: "#6b7280" }}>
        {num((page - 1) * per + 1)}–{num(Math.min(page * per, total))} of {num(total)}
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" style={S.pageBtn} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span style={{ alignSelf: "center", fontSize: 12, color: "#374151" }}>Page {page} / {pages}</span>
        <button type="button" style={S.pageBtn} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

/* ── Charts ──────────────────────────────────────────────────────────────── */
function TrendChart({ data, metric }) {
  const [hover, setHover] = useState(null);
  const valueOf = (b) => (metric === "units" ? b.units : metric === "orders" ? b.orders : b.net);
  const fmt = metric === "net" ? compact : compactNum;
  const max = niceMax(Math.max(0, ...data.map(valueOf)));
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  const best = data.reduce((m, b) => (valueOf(b) > (m ? valueOf(m) : 0) ? b : m), null);
  const minBar = data.length > 16 ? 26 : 0;

  if (!data.length) return <Empty />;

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 240, paddingBottom: 0, fontSize: 11, color: "#9ca3af", textAlign: "right", minWidth: 44 }}>
        {ticks.map((t) => <span key={t} style={{ lineHeight: "12px", transform: "translateY(-6px)" }}>{fmt(max * t)}</span>)}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
        <div style={{ position: "relative", height: 240, minWidth: minBar ? data.length * minBar : undefined }}>
          {ticks.map((t) => (
            <div key={t} style={{ position: "absolute", left: 0, right: 0, top: `${(1 - t) * 100}%`, borderTop: t === 0 ? "1px solid #d1d5db" : "1px dashed #eef0f3" }} />
          ))}
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", gap: data.length > 24 ? 3 : 8, padding: "0 4px" }}>
            {data.map((b, i) => {
              const v = valueOf(b);
              const h = max ? (v / max) * 100 : 0;
              const isBest = best && b.key === best.key && v > 0;
              return (
                <div
                  key={b.key}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative", outline: "none" }}
                >
                  <div
                    style={{
                      width: "100%", maxWidth: 46, height: `${Math.max(h, v > 0 ? 1.5 : 0)}%`,
                      background: isBest ? "linear-gradient(180deg,#22c55e,#16a34a)" : hover === i ? "#4f46e5" : "linear-gradient(180deg,#818cf8,#6366f1)",
                      borderRadius: "6px 6px 2px 2px", transition: "height .35s ease, background .15s",
                    }}
                  />
                  {hover === i && (
                    <div style={{ ...S.tooltip, left: "50%", bottom: `calc(${Math.min(h, 78)}% + 10px)`, transform: `translateX(${i < 2 ? "-20%" : i > data.length - 3 ? "-80%" : "-50%"})` }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{b.label}</div>
                      <div>Net sales: <b>{money(b.net)}</b></div>
                      <div>Taxable: {money(b.taxable)} · GST: {money(b.gst)}</div>
                      <div>Orders: {num(b.orders)} · Units: {num(b.units)}</div>
                      <div>Customers: {num(b.customers)} · Products: {num(b.products)}</div>
                      {b.cancelledOrders > 0 && <div style={{ color: "#fca5a5" }}>Cancelled: {b.cancelledOrders} ({money(b.cancelledValue)})</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: data.length > 24 ? 3 : 8, padding: "6px 4px 0", minWidth: minBar ? data.length * minBar : undefined }}>
          {data.map((b) => (
            <div key={b.key} style={{ flex: 1, textAlign: "center", fontSize: 10.5, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={b.label}>
              {b.label.replace("Week of ", "")}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BarList({ rows, value, format, label, sub, color = "#6366f1", onClick, limit = 10 }) {
  const shown = rows.slice(0, limit);
  const max = Math.max(0, ...shown.map(value));
  if (!shown.length) return <Empty />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {shown.map((r, i) => {
        const v = value(r);
        return (
          <div key={r.key || r.productKey || r.name || i} onClick={onClick ? () => onClick(r) : undefined} style={{ cursor: onClick ? "pointer" : "default" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, marginBottom: 5 }}>
              <span style={{ minWidth: 0, display: "flex", gap: 8, alignItems: "baseline" }}>
                <span style={{ color: "#9ca3af", fontSize: 11, fontVariantNumeric: "tabular-nums", width: 16, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: "#111827", ...(onClick ? { textDecoration: "underline", textDecorationColor: "#e5e7eb", textUnderlineOffset: 3 } : {}) }}>{label(r)}</span>
                  {sub && <span style={{ display: "block", fontSize: 11.5, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub(r)}</span>}
                </span>
              </span>
              <span style={{ fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{format(v)}</span>
            </div>
            <div style={{ height: 7, background: "#f1f2f6", borderRadius: 10, marginLeft: 24 }}>
              <div style={{ height: "100%", width: `${max ? Math.max((v / max) * 100, v > 0 ? 2 : 0) : 0}%`, background: i === 0 ? "#22c55e" : color, borderRadius: 10, transition: "width .4s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SplitBar({ rows, value = (r) => r.net, format = money0, label = (r) => r.name }) {
  const total = rows.reduce((s, r) => s + value(r), 0);
  if (!rows.length || total <= 0) return <Empty text="No data" />;
  return (
    <div>
      <div style={{ display: "flex", height: 12, borderRadius: 10, overflow: "hidden", background: "#f1f2f6" }}>
        {rows.map((r, i) => (
          <div key={label(r)} title={`${label(r)}: ${format(value(r))}`} style={{ width: `${(value(r) / total) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
        ))}
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        {rows.map((r, i) => (
          <div key={label(r)} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, color: "#374151" }}>{label(r)}</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{format(value(r))}</span>
            <span style={{ width: 48, textAlign: "right", color: "#6b7280", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{((value(r) / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Product details drawer ──────────────────────────────────────────────── */
function ProductDrawer({ product, report, onClose, canViewPayments }) {
  const [metric, setMetric] = useState("net");
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lines = useMemo(() => report.lines.filter((l) => l.productKey === product.productKey), [report.lines, product.productKey]);
  const series = report.trend.map((b) => {
    const c = product.buckets?.[b.key] || { net: 0, units: 0, orders: 0 };
    return { key: b.key, label: b.label, net: c.net, units: c.units, orders: c.orders, taxable: 0, gst: 0, customers: 0, products: 1, cancelledOrders: 0 };
  });
  const customers = useMemo(() => {
    const m = new Map();
    for (const l of lines) {
      const k = l.customerId || l.customerName;
      if (!m.has(k)) m.set(k, { key: k, name: l.customerName, company: l.company, type: l.customerType, units: 0, net: 0, orders: new Set() });
      const c = m.get(k);
      c.units += l.qty; c.net += l.net; c.orders.add(l.orderId);
    }
    return [...m.values()].map((c) => ({ ...c, orders: c.orders.size })).sort((a, b) => b.net - a.net);
  }, [lines]);
  const optionMix = useMemo(() => {
    const m = new Map();
    for (const l of lines) {
      const k = l.options || "Standard (no options)";
      if (!m.has(k)) m.set(k, { name: k, units: 0, net: 0 });
      m.get(k).units += l.qty; m.get(k).net += l.net;
    }
    return [...m.values()].sort((a, b) => b.net - a.net);
  }, [lines]);

  return (
    <div style={S.overlay} onClick={onClose}>
      <aside style={S.drawer} onClick={(e) => e.stopPropagation()} aria-label={`${product.name} sales details`}>
        <div style={S.drawerHead}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".06em" }}>
              {product.rank ? `Rank #${product.rank} · ` : ""}{product.category}
            </div>
            <h2 style={{ margin: "4px 0 2px", fontSize: 20, fontWeight: 700, color: "#111827" }}>{product.name}</h2>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {product.sku ? `SKU ${product.sku}` : "No SKU"}{product.hsnCode ? ` · HSN ${product.hsnCode}` : ""}
            </div>
          </div>
          <button type="button" onClick={onClose} style={S.iconBtn} aria-label="Close"><FiX size={18} /></button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 18 }}>
          <div style={S.miniGrid}>
            {[
              ["Net sales", money(product.net)],
              ["Share of sales", `${product.share}%`],
              ["Units sold", num(product.units)],
              ["Orders", num(product.orders)],
              ["Customers", num(product.customers)],
              ["Avg unit price", money(product.avgPrice)],
              ["Price range", product.orders ? `${money(product.minPrice)} – ${money(product.maxPrice)}` : "—"],
              ["Taxable value", money(product.taxable)],
              ["GST", money(product.gst)],
              ["Discount given", money(product.discount)],
              ["Cancelled", `${product.cancelledOrders} orders · ${money(product.cancelledValue)}`],
              ["Best period", product.bestPeriod ? `${product.bestPeriod} (${compact(product.bestPeriodNet)})` : "—"],
              ["First sold", day(product.firstSold)],
              ["Last sold", day(product.lastSold)],
            ].map(([k, v]) => (
              <div key={k} style={S.mini}>
                <div style={S.miniLabel}>{k}</div>
                <div style={S.miniValue}>{v}</div>
              </div>
            ))}
          </div>

          {product.growth !== undefined && (
            <div style={{ fontSize: 13, color: "#374151", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              Previous period: <b>{money(product.prevNet)}</b> ({num(product.prevUnits)} units) <Delta value={product.growth} suffix="" />
            </div>
          )}

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <h4 style={S.subHead}>Sales by period</h4>
              <Toggle value={metric} onChange={setMetric} options={[{ value: "net", label: "Sales" }, { value: "units", label: "Units" }]} />
            </div>
            <TrendChart data={series} metric={metric} />
          </div>

          <div>
            <h4 style={S.subHead}>B2B vs B2C</h4>
            <SplitBar rows={[{ name: "B2B", net: product.b2bNet, units: product.b2bUnits }, { name: "B2C", net: product.b2cNet, units: product.b2cUnits }].filter((r) => r.net > 0)} />
          </div>

          {optionMix.length > 1 && (
            <div>
              <h4 style={S.subHead}>Options chosen</h4>
              <BarList rows={optionMix} value={(r) => r.net} format={money0} label={(r) => r.name} sub={(r) => `${num(r.units)} units`} limit={8} />
            </div>
          )}

          <div>
            <h4 style={S.subHead}>Top customers for this product</h4>
            <BarList rows={customers} value={(r) => r.net} format={money0} label={(r) => r.name} sub={(r) => `${r.type} · ${r.company ? `${r.company} · ` : ""}${r.orders} orders · ${num(r.units)} units`} limit={8} />
          </div>

          <div>
            <h4 style={S.subHead}>Orders ({lines.length})</h4>
            <div style={{ overflowX: "auto", border: "1px solid #eef0f3", borderRadius: 10 }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, textAlign: "left" }}>Date</th>
                    <th style={{ ...S.th, textAlign: "left" }}>Order</th>
                    <th style={{ ...S.th, textAlign: "left" }}>Customer</th>
                    <th style={S.th}>Qty</th>
                    <th style={S.th}>Price</th>
                    <th style={S.th}>Net</th>
                    <th style={{ ...S.th, textAlign: "left" }}>Status</th>
                    {canViewPayments && <th style={{ ...S.th, textAlign: "left" }}>Payment</th>}
                  </tr>
                </thead>
                <tbody>
                  {lines.slice(0, 50).map((l) => (
                    <tr key={`${l.orderId}-${l.lineNo}`}>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>{day(l.date)}</td>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                        <Link href={`/dashboard/admin/orders/${l.orderId}`} style={S.link}>#{l.orderNumber}</Link>
                        {l.options && <div style={{ fontSize: 11, color: "#6b7280", maxWidth: 220, whiteSpace: "normal" }}>{l.options}</div>}
                      </td>
                      <td style={S.td}>{l.customerName} <TypeBadge type={l.customerType} /></td>
                      <td style={S.tdNum}>{num(l.qty)}</td>
                      <td style={S.tdNum}>{money(l.price)}</td>
                      <td style={{ ...S.tdNum, fontWeight: 700 }}>{money(l.net)}</td>
                      <td style={S.td}><StatusBadge status={l.status} /></td>
                      {canViewPayments && <td style={{ ...S.td, whiteSpace: "nowrap" }}>{l.paymentMethod} · {l.paymentStatus}</td>}
                    </tr>
                  ))}
                  {!lines.length && <tr><td colSpan={8}><Empty /></td></tr>}
                </tbody>
              </table>
            </div>
            {lines.length > 50 && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Showing latest 50 of {lines.length}. Export to Excel for the full list.</div>}
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function ProductSalesReport() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filters, setFilters] = useState(() => {
    const [from, to] = presetRange(DEFAULT_FILTERS.preset);
    return { ...DEFAULT_FILTERS, from, to };
  });
  const [searchInput, setSearchInput] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [trendMetric, setTrendMetric] = useState("net");
  const [topMetric, setTopMetric] = useState("net");
  const [matrixMetric, setMatrixMetric] = useState("net");
  const [matrixAll, setMatrixAll] = useState(false);
  const [prodSearch, setProdSearch] = useState("");
  const [prodSort, setProdSort] = useState({ key: "net", dir: "desc" });
  const [prodPage, setProdPage] = useState(1);
  const [lineSearch, setLineSearch] = useState("");
  const [linePage, setLinePage] = useState(1);
  const [noSalesAll, setNoSalesAll] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const reqId = useRef(0);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));

  // Debounced customer / order search
  useEffect(() => {
    const t = setTimeout(() => set({ search: searchInput.trim() }), 450);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError("");
    const params = {};
    for (const [k, v] of Object.entries(filters)) if (v && k !== "preset") params[k] = v;
    axios
      .get("/api/admin/reports/product-sales", { params, withCredentials: true })
      .then((r) => {
        if (id !== reqId.current) return;
        setReport(r.data);
        setProdPage(1);
        setLinePage(1);
      })
      .catch((e) => {
        if (id !== reqId.current) return;
        const msg = e.response?.data?.message || "Failed to load the report";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => id === reqId.current && setLoading(false));
  }, [filters, reloadKey]);

  const options = report?.options || { categories: [], products: [], states: [] };
  const canViewPayments = report?.canViewPayments === true;

  // Products for the chosen category (including sub-categories)
  const productOptions = useMemo(() => {
    if (!filters.category) return options.products;
    const ids = new Set([filters.category]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of options.categories) {
        if (c.parent && ids.has(String(c.parent)) && !ids.has(String(c._id))) { ids.add(String(c._id)); grew = true; }
      }
    }
    return options.products.filter((p) => ids.has(String(p.category)));
  }, [filters.category, options]);

  const applyPreset = (key) => {
    const [from, to] = presetRange(key);
    set({ preset: key, from, to, groupBy: key === "today" || key === "7d" || key === "30d" ? "day" : filters.groupBy === "day" ? "month" : filters.groupBy });
  };

  const resetFilters = () => {
    const [from, to] = presetRange(DEFAULT_FILTERS.preset);
    setSearchInput("");
    setFilters({ ...DEFAULT_FILTERS, from, to });
  };

  const activeCount = ["userType", "category", "product", "paymentMethod", "paymentStatus", "state", "search"].filter((k) => filters[k]).length + (filters.status !== "valid" ? 1 : 0);

  const s = report?.summary;
  const p = report?.previousSummary;
  const hasSales = !!s && s.orders > 0;
  const periodWord = filters.groupBy === "day" ? "day" : filters.groupBy === "week" ? "week" : "month";
  const rangeText = filters.from || filters.to ? `${filters.from ? day(`${filters.from}T00:00:00+05:30`) : "Beginning"} – ${filters.to ? day(`${filters.to}T00:00:00+05:30`) : "Today"}` : "All time";

  /* ── Derived insights ── */
  const insights = useMemo(() => {
    if (!report || !hasSales) return [];
    const out = [];
    const prods = report.products.filter((x) => x.orders > 0);
    const top = prods[0];
    if (top) out.push({ icon: FiAward, color: "#22c55e", title: "Top product", main: top.name, detail: `${money0(top.net)} · ${top.share}% of sales · ${num(top.units)} units`, product: top });
    const byUnits = [...prods].sort((a, b) => b.units - a.units)[0];
    if (byUnits && byUnits.productKey !== top?.productKey) out.push({ icon: FiPackage, color: "#0ea5e9", title: "Most units sold", main: byUnits.name, detail: `${num(byUnits.units)} units · ${money0(byUnits.net)}`, product: byUnits });
    const withSales = report.trend.filter((b) => b.net > 0);
    const bestP = [...withSales].sort((a, b) => b.net - a.net)[0];
    if (bestP) out.push({ icon: FiCalendar, color: "#6366f1", title: `Best ${periodWord}`, main: bestP.label, detail: `${money0(bestP.net)} · ${bestP.orders} orders · ${num(bestP.units)} units` });
    if (report.trend.length > 1) {
      const worst = [...report.trend].sort((a, b) => a.net - b.net)[0];
      if (worst && worst.key !== bestP?.key) out.push({ icon: FiTrendingDown, color: "#ef4444", title: `Slowest ${periodWord}`, main: worst.label, detail: worst.net > 0 ? `${money0(worst.net)} · ${worst.orders} orders` : "No sales" });
    }
    const cat = report.categories[0];
    if (cat) out.push({ icon: FiLayers, color: "#a855f7", title: "Top category", main: cat.name, detail: `${money0(cat.net)} · ${cat.share}% of sales` });
    if (report.previousSummary) {
      const growers = prods.filter((x) => x.prevNet > 0 && x.growth !== null).sort((a, b) => b.growth - a.growth);
      if (growers[0] && growers[0].growth > 0) out.push({ icon: FiTrendingUp, color: "#16a34a", title: "Fastest growing", main: growers[0].name, detail: `+${growers[0].growth}% vs previous period`, product: growers[0] });
      const decliners = report.products.filter((x) => x.prevNet > 0 && (x.growth ?? 0) < 0).sort((a, b) => a.growth - b.growth);
      if (decliners[0]) out.push({ icon: FiAlertTriangle, color: "#f59e0b", title: "Biggest drop", main: decliners[0].name, detail: `${decliners[0].growth}% · ${money0(decliners[0].prevNet)} → ${money0(decliners[0].net)}`, product: decliners[0] });
      const newOnes = prods.filter((x) => x.prevNet === 0).length;
      if (newOnes) out.push({ icon: FiShoppingBag, color: "#14b8a6", title: "Newly selling", main: `${newOnes} product${newOnes > 1 ? "s" : ""}`, detail: "Had no sales in the previous period" });
    }
    const b2b = report.customerTypes.find((c) => c.name === "B2B");
    if (b2b) out.push({ icon: FiUsers, color: "#1d4ed8", title: "B2B share", main: `${b2b.share}%`, detail: `${money0(b2b.net)} from ${b2b.customers} B2B customers` });
    const repeat = report.customers.filter((c) => c.orders > 1).length;
    if (report.customers.length) out.push({ icon: FiRefreshCw, color: "#64748b", title: "Repeat customers", main: `${repeat} of ${report.customers.length}`, detail: `${((repeat / report.customers.length) * 100).toFixed(0)}% ordered more than once` });
    if (report.noSales.length) out.push({ icon: FiAlertTriangle, color: "#ef4444", title: "Not selling", main: `${report.noSales.length} products`, detail: "Published but no sales in this period" });
    return out;
  }, [report, hasSales, periodWord]);

  /* ── Products table data ── */
  const productRows = useMemo(() => {
    if (!report) return [];
    const q = prodSearch.trim().toLowerCase();
    const rows = report.products.filter((x) => (x.orders > 0 || x.cancelledOrders > 0) && (!q || `${x.name} ${x.sku} ${x.category}`.toLowerCase().includes(q)));
    const { key, dir } = prodSort;
    const val = (x) => (key === "lastSold" ? (x.lastSold ? new Date(x.lastSold).getTime() : 0) : key === "name" ? x.name.toLowerCase() : key === "growth" ? (x.growth === null ? Infinity : x.growth ?? -Infinity) : x[key] ?? 0);
    return rows.sort((a, b) => {
      const va = val(a), vb = val(b);
      const c = va < vb ? -1 : va > vb ? 1 : 0;
      return dir === "asc" ? c : -c;
    });
  }, [report, prodSearch, prodSort]);
  const PROD_PER = 15;
  const prodPages = Math.max(1, Math.ceil(productRows.length / PROD_PER));

  /* ── Lines table data ── */
  const lineRows = useMemo(() => {
    if (!report) return [];
    const q = lineSearch.trim().toLowerCase();
    if (!q) return report.lines;
    return report.lines.filter((l) => `${l.orderNumber} ${l.orderName} ${l.customerName} ${l.company} ${l.productName} ${l.options} ${l.state} ${l.status}`.toLowerCase().includes(q));
  }, [report, lineSearch]);
  const LINE_PER = 20;
  const linePages = Math.max(1, Math.ceil(lineRows.length / LINE_PER));

  /* ── Matrix data ── */
  const matrix = useMemo(() => {
    if (!report) return { rows: [], cols: [], max: 0, colTotals: [], leaders: {} };
    const cols = report.trend;
    const key = matrixMetric === "units" ? "units" : "net";
    const sold = report.products.filter((x) => x.orders > 0);
    const rows = [...sold].sort((a, b) => b[key] - a[key]).slice(0, matrixAll ? undefined : 20);
    let max = 0;
    const leaders = {};
    for (const c of cols) {
      let best = null;
      for (const r of sold) {
        const v = r.buckets?.[c.key]?.[key] || 0;
        if (v > max) max = v;
        if (v > 0 && (!best || v > best.v)) best = { k: r.productKey, v };
      }
      if (best) leaders[c.key] = best.k;
    }
    const colTotals = cols.map((c) => (key === "units" ? c.units : c.net));
    return { rows, cols, max, colTotals, leaders, key, hidden: sold.length - rows.length };
  }, [report, matrixMetric, matrixAll]);

  /* ── Excel export ── */
  const exportExcel = () => {
    if (!report) return;
    try {
      const wb = XLSX.utils.book_new();
      const labelOf = (list, id) => list.find((x) => String(x._id) === String(id))?.name || "";
      const addSheet = (name, rows, widths) => {
        const ws = Array.isArray(rows[0]) ? XLSX.utils.aoa_to_sheet(rows) : XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No data for the selected filters" }]);
        if (widths) ws["!cols"] = widths.map((w) => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws, name);
      };
      const change = (cur, prev) => {
        if (!p) return "";
        const v = pct(cur, prev);
        return v === null ? "New" : r2(v);
      };

      // Summary
      const summaryRows = [
        ["Product Sales Report — One Prime Studios"],
        ["Generated on", dayTime(report.generatedAt)],
        [],
        ["Filters applied"],
        ["Period", rangeText],
        ["Group by", filters.groupBy],
        ["Order status", STATUS_OPTIONS.find((o) => o.value === filters.status)?.label || filters.status],
        ["Customer type", filters.userType === "partner" ? "B2B" : filters.userType === "customer" ? "B2C" : "All"],
        ["Category", labelOf(options.categories, filters.category) || "All"],
        ["Product", labelOf(options.products, filters.product) || "All"],
        ...(canViewPayments ? [["Payment method", filters.paymentMethod || "All"], ["Payment status", filters.paymentStatus || "All"]] : []),
        ["State", filters.state || "All"],
        ["Search", filters.search || "—"],
        ...(report.previousRange ? [["Compared with", `${day(report.previousRange.from)} – ${day(report.previousRange.to)}`]] : []),
        [],
        ["Key figures", "This period", ...(p ? ["Previous period", "Change %"] : [])],
        ...[
          ["Net sales (incl. GST)", "net"], ["Taxable value", "taxable"], ["GST", "gst"], ["Gross value (before discount)", "gross"],
          ["Discount given", "discount"], ["Orders", "orders"], ["Units sold", "units"], ["Customers", "customers"],
          ["Products sold", "products"], ["Average order value", "avgOrderValue"], ["Average unit price", "avgUnitPrice"],
        ].map(([label, k]) => [label, s[k], ...(p ? [p[k], change(s[k], p[k])] : [])]),
        ["Delivered orders", s.deliveredOrders],
        ["In-progress orders", s.inProgressOrders],
        ["Cancelled / rejected orders", s.cancelledOrders],
        ["Cancelled value", s.cancelledValue],
        ["Cancellation rate %", s.cancellationRate],
        [],
        ["Insights"],
        ...insights.map((i) => [i.title, `${i.main} — ${i.detail}`]),
      ];
      addSheet("Summary", summaryRows, [32, 44, 18, 12]);

      // Products
      addSheet("Products", report.products.map((x) => ({
        Rank: x.rank || "", Product: x.name, SKU: x.sku, HSN: x.hsnCode, Category: x.category,
        Orders: x.orders, "Units Sold": x.units, Customers: x.customers,
        "Avg Unit Price": x.avgPrice, "Min Price": x.minPrice, "Max Price": x.maxPrice,
        "Gross Value": x.gross, Discount: x.discount, "Taxable Value": x.taxable, GST: x.gst, "Net Sales": x.net, "Share %": x.share,
        "B2B Units": x.b2bUnits, "B2B Sales": x.b2bNet, "B2C Units": x.b2cUnits, "B2C Sales": x.b2cNet,
        ...(p ? { "Previous Period Sales": x.prevNet, "Previous Period Units": x.prevUnits, "Growth %": x.growth === null ? "New" : x.growth } : {}),
        [`Best ${periodWord}`]: x.bestPeriod, [`Best ${periodWord} Sales`]: x.bestPeriodNet,
        "Cancelled Orders": x.cancelledOrders, "Cancelled Units": x.cancelledUnits, "Cancelled Value": x.cancelledValue,
        "First Sold": day(x.firstSold), "Last Sold": day(x.lastSold),
      })), [6, 34, 14, 10, 20, 8, 10, 10, 12, 10, 10, 12, 10, 13, 10, 12, 8, 10, 11, 10, 11, 14, 14, 10, 16, 14, 10, 10, 12, 13, 13]);

      // Product × period (sales and units)
      const matrixSheet = (key) => report.products.filter((x) => x.orders > 0).map((x) => {
        const row = { Product: x.name, Category: x.category };
        for (const b of report.trend) row[b.label] = r2(x.buckets?.[b.key]?.[key] || 0);
        row.Total = key === "units" ? x.units : x.net;
        return row;
      });
      const mWidths = [34, 18, ...report.trend.map(() => 13), 13];
      addSheet(`Sales by ${periodWord}`.slice(0, 31), matrixSheet("net"), mWidths);
      addSheet(`Units by ${periodWord}`.slice(0, 31), matrixSheet("units"), mWidths);

      // Trend
      addSheet(`${periodWord[0].toUpperCase()}${periodWord.slice(1)} trend`, report.trend.map((b) => {
        const lead = report.periodLeaders.find((x) => x.key === b.key);
        return {
          Period: b.label, Orders: b.orders, "Units Sold": b.units, Customers: b.customers, "Products Sold": b.products,
          "Gross Value": b.gross, Discount: b.discount, "Taxable Value": b.taxable, GST: b.gst, "Net Sales": b.net, "Avg Order Value": b.avgOrderValue,
          "Cancelled Orders": b.cancelledOrders, "Cancelled Value": b.cancelledValue,
          "Top Product": lead?.top?.name || "", "Top Product Sales": lead?.top?.net || 0, "Top Product Share %": lead?.share || 0,
          "Runner-up": lead?.runnerUp?.name || "", "Runner-up Sales": lead?.runnerUp?.net || 0,
        };
      }), [20, 8, 10, 10, 12, 12, 10, 13, 10, 12, 14, 14, 14, 30, 16, 16, 30, 14]);

      addSheet("Categories", report.categories.map((c) => ({
        Category: c.name, Orders: c.orders, "Units Sold": c.units, Products: c.products, Customers: c.customers,
        "Taxable Value": c.taxable, GST: c.gst, "Net Sales": c.net, "Share %": c.share,
      })), [26, 8, 10, 10, 10, 14, 12, 14, 8]);

      addSheet("Customers", report.customers.map((c, i) => ({
        Rank: i + 1, Customer: c.name, Company: c.company, Type: c.type, Email: c.email, Phone: c.phone, State: c.state,
        Orders: c.orders, "Units Bought": c.units, "Products Bought": c.products, "Taxable Value": c.taxable, GST: c.gst,
        "Net Sales": c.net, "Share %": c.share, "Avg Order Value": c.avgOrderValue, "Last Order": day(c.lastOrder),
      })), [6, 24, 26, 6, 28, 14, 16, 8, 12, 14, 14, 10, 12, 8, 14, 14]);

      addSheet("States", report.states.map((x) => ({
        State: x.name, Orders: x.orders, "Units Sold": x.units, Customers: x.customers, "Net Sales": x.net, "Share %": x.share,
      })), [22, 8, 10, 10, 14, 8]);

      addSheet("Order Status", report.statusBreakdown.map((x) => ({ Status: x.name, Orders: x.orders, Units: x.units, Value: x.net })), [22, 8, 10, 14]);

      if (canViewPayments) {
        addSheet("Payments", [
          ...report.paymentMethods.map((x) => ({ Group: "Payment method", Name: x.name, Orders: x.orders, "Net Sales": x.net, "Share %": x.share })),
          ...report.paymentStatuses.map((x) => ({ Group: "Payment status", Name: x.name, Orders: x.orders, "Net Sales": x.net, "Share %": x.share })),
        ], [18, 16, 8, 14, 8]);
      }

      addSheet("No Sales Products", report.noSales.map((x) => ({
        Product: x.name, SKU: x.sku, Category: x.category, "Listed For": (x.productFor || "").toUpperCase(),
        "Listed On": day(x.listedOn), "Last Sold (ever)": x.lastSold ? day(x.lastSold) : "Never", "Lifetime Units": x.lifetimeUnits,
      })), [34, 14, 20, 10, 14, 16, 14]);

      addSheet("Order Lines", report.lines.map((l) => ({
        Date: dayTime(l.date), "Order No": l.orderNumber, "Order Name": l.orderName, Status: l.status,
        Customer: l.customerName, Company: l.company, Type: l.customerType, Email: l.email, Phone: l.phone, State: l.state, City: l.city,
        Product: l.productName, SKU: l.sku, HSN: l.hsnCode, Category: l.category, Options: l.options,
        Qty: l.qty, "Unit Price": l.price, "Gross Value": l.gross, Discount: l.discount, GST: l.gst, "Net Amount": l.net,
        ...(canViewPayments ? { "Payment Method": l.paymentMethod, "Payment Status": l.paymentStatus } : {}),
        "Delivered On": l.deliveredAt ? day(l.deliveredAt) : "",
      })), [20, 22, 20, 16, 22, 24, 6, 26, 13, 16, 14, 30, 12, 10, 18, 36, 8, 11, 12, 10, 10, 12, 14, 14, 14]);

      const stamp = filters.from || filters.to ? `${filters.from || "start"}_to_${filters.to || "today"}` : "all-time";
      XLSX.writeFile(wb, `product-sales-report_${stamp}.xlsx`);
      toast.success("Excel report downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not create the Excel file");
    }
  };

  const openProduct = (x) => {
    const full = report?.products.find((y) => y.productKey === x.productKey);
    if (full) setDrawer(full);
  };

  /* ── Render ── */
  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area" style={{ flex: 1, minWidth: 0, background: "#f6f7fb" }}>
        {/* Top bar */}
        <nav style={S.topbar}>
          <button type="button" onClick={() => setSidebarOpen((v) => !v)} style={S.burger} aria-label="Toggle sidebar">☰</button>
          <FiBarChart2 size={18} style={{ marginRight: 8, color: "#6366f1", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>Product Sales Report</div>
            <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {rangeText}{report?.previousRange ? ` · compared with ${day(report.previousRange.from)} – ${day(report.previousRange.to)}` : ""}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} style={S.ghostBtn} title="Refresh" disabled={loading}>
              <FiRefreshCw size={14} style={loading ? { animation: "psr-spin 1s linear infinite" } : undefined} />
            </button>
            <button type="button" onClick={exportExcel} disabled={!report || loading} style={{ ...S.exportBtn, opacity: !report || loading ? 0.6 : 1 }}>
              <FiDownload size={14} /> <span className="psr-hide-xs">Export Excel</span>
            </button>
          </div>
        </nav>

        <div style={S.body}>
          {/* Filters */}
          <section style={S.panel}>
            <div style={S.presetRow}>
              {PRESETS.map((x) => (
                <button key={x.key} type="button" onClick={() => applyPreset(x.key)} style={{ ...S.chip, ...(filters.preset === x.key ? S.chipOn : {}) }}>
                  {x.label}
                </button>
              ))}
              <button type="button" onClick={() => set({ preset: "custom" })} style={{ ...S.chip, ...(filters.preset === "custom" ? S.chipOn : {}) }}>Custom</button>
            </div>

            <div style={S.filterGrid}>
              <label style={S.field}>
                <span style={S.fieldLabel}>From</span>
                <input id="psr-from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value, preset: "custom" })} style={S.input} />
              </label>
              <label style={S.field}>
                <span style={S.fieldLabel}>To</span>
                <input id="psr-to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value, preset: "custom" })} style={S.input} />
              </label>
              <label style={S.field}>
                <span style={S.fieldLabel}>Group by</span>
                <select id="psr-group" value={filters.groupBy} onChange={(e) => set({ groupBy: e.target.value })} style={S.input}>
                  <option value="month">Month</option>
                  <option value="week">Week</option>
                  <option value="day">Day</option>
                </select>
              </label>
              <label style={S.field}>
                <span style={S.fieldLabel}>Order status</span>
                <select id="psr-status" value={filters.status} onChange={(e) => set({ status: e.target.value })} style={S.input}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
              <label style={S.field}>
                <span style={S.fieldLabel}>Customer type</span>
                <select id="psr-type" value={filters.userType} onChange={(e) => set({ userType: e.target.value })} style={S.input}>
                  <option value="">All (B2B + B2C)</option>
                  <option value="partner">B2B</option>
                  <option value="customer">B2C</option>
                </select>
              </label>
              <label style={S.field}>
                <span style={S.fieldLabel}>Category</span>
                <select id="psr-category" value={filters.category} onChange={(e) => set({ category: e.target.value, product: "" })} style={S.input}>
                  <option value="">All categories</option>
                  {options.categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </label>
              <label style={S.field}>
                <span style={S.fieldLabel}>Product</span>
                <select id="psr-product" value={filters.product} onChange={(e) => set({ product: e.target.value })} style={S.input}>
                  <option value="">All products</option>
                  {productOptions.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}
                </select>
              </label>
              <label style={S.field}>
                <span style={S.fieldLabel}>Delivery state</span>
                <select id="psr-state" value={filters.state} onChange={(e) => set({ state: e.target.value })} style={S.input}>
                  <option value="">All states</option>
                  {[...new Set([...options.states, ...(filters.state ? [filters.state] : [])])].map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </label>
              {canViewPayments && (
                <>
                  <label style={S.field}>
                    <span style={S.fieldLabel}>Payment method</span>
                    <select id="psr-paymethod" value={filters.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })} style={S.input}>
                      <option value="">All methods</option>
                      <option value="Wallet">Wallet</option>
                      <option value="Razorpay">Razorpay</option>
                    </select>
                  </label>
                  <label style={S.field}>
                    <span style={S.fieldLabel}>Payment status</span>
                    <select id="psr-paystatus" value={filters.paymentStatus} onChange={(e) => set({ paymentStatus: e.target.value })} style={S.input}>
                      <option value="">All payment statuses</option>
                      <option value="PAID">Paid</option>
                      <option value="UNPAID">Unpaid</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </label>
                </>
              )}
              <label style={{ ...S.field, gridColumn: "span 2" }} className="psr-span">
                <span style={S.fieldLabel}>Customer / order search</span>
                <span style={{ position: "relative", display: "block" }}>
                  <FiSearch style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} size={14} />
                  <input
                    id="psr-search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Order no, customer, company, email, phone…"
                    style={{ ...S.input, paddingLeft: 32, width: "100%" }}
                  />
                </span>
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <span style={{ fontSize: 12.5, color: "#6b7280" }}>
                {loading ? "Updating report…" : report ? `${num(s.orders)} orders · ${num(report.lines.length)} order lines · updated ${dayTime(report.generatedAt)}` : ""}
                {activeCount > 0 && <b style={{ color: "#6366f1" }}> · {activeCount} filter{activeCount > 1 ? "s" : ""} active</b>}
              </span>
              <button type="button" onClick={resetFilters} style={S.linkBtn}><FiX size={12} /> Reset filters</button>
            </div>
          </section>

          {error && !report && (
            <div style={{ ...S.panel, color: "#b91c1c", display: "flex", gap: 10, alignItems: "center" }}>
              <FiAlertTriangle /> {error}
              <button type="button" style={{ ...S.ghostBtn, marginLeft: "auto" }} onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
            </div>
          )}

          {!report && loading && <div style={{ ...S.panel, ...S.empty }}>Loading report…</div>}

          {report && (
            <div style={{ display: "grid", gap: 18, opacity: loading ? 0.55 : 1, transition: "opacity .2s", pointerEvents: loading ? "none" : "auto" }}>
              {/* KPIs */}
              <div style={S.kpiGrid}>
                <Kpi label="Net sales (incl. GST)" value={money0(s.net)} color="#6366f1" icon={FiBarChart2} delta={p ? pct(s.net, p.net) : undefined} sub={p ? `prev ${compact(p.net)}` : undefined} />
                <Kpi label="Taxable value" value={money0(s.taxable)} color="#0ea5e9" icon={FiLayers} delta={p ? pct(s.taxable, p.taxable) : undefined} sub={`GST ${money0(s.gst)}`} />
                <Kpi label="Orders" value={num(s.orders)} color="#22c55e" icon={FiShoppingBag} delta={p ? pct(s.orders, p.orders) : undefined} sub={`${s.deliveredOrders} delivered · ${s.inProgressOrders} in progress`} />
                <Kpi label="Units sold" value={compactNum(s.units)} color="#f59e0b" icon={FiPackage} delta={p ? pct(s.units, p.units) : undefined} sub={`avg ${money(s.avgUnitPrice)} / unit`} />
                <Kpi label="Avg order value" value={money0(s.avgOrderValue)} color="#a855f7" icon={FiTrendingUp} delta={p ? pct(s.avgOrderValue, p.avgOrderValue) : undefined} />
                <Kpi label="Products sold" value={num(s.products)} color="#14b8a6" icon={FiPackage} delta={p ? pct(s.products, p.products) : undefined} sub={report.noSales.length ? `${report.noSales.length} with no sales` : undefined} />
                <Kpi label="Customers" value={num(s.customers)} color="#1d4ed8" icon={FiUsers} delta={p ? pct(s.customers, p.customers) : undefined} />
                <Kpi label="Discount given" value={money0(s.discount)} color="#64748b" icon={FiLayers} sub={s.gross ? `${((s.discount / s.gross) * 100).toFixed(1)}% of gross` : undefined} />
                <Kpi label="Cancelled" value={`${s.cancelledOrders} orders`} color="#ef4444" icon={FiAlertTriangle} sub={`${money0(s.cancelledValue)} · ${s.cancellationRate}% rate`} />
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <Panel title="Highlights" subtitle="Worked out automatically from the filtered sales">
                  <div style={S.insightGrid}>
                    {insights.map((i) => (
                      <div
                        key={i.title}
                        style={{ ...S.insight, cursor: i.product ? "pointer" : "default" }}
                        onClick={i.product ? () => openProduct(i.product) : undefined}
                      >
                        <span style={{ ...S.kpiIcon, background: `${i.color}1a`, color: i.color, width: 32, height: 32 }}><i.icon size={15} /></span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#6b7280" }}>{i.title}</div>
                          <div style={{ fontWeight: 700, color: "#111827", fontSize: 14, margin: "2px 0", overflowWrap: "anywhere" }}>{i.main}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{i.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {!hasSales && (
                <div style={{ ...S.panel, ...S.empty }}>
                  No sales in this period for the selected filters. Try a wider date range or reset the filters.
                </div>
              )}

              {/* Trend + categories */}
              <div style={S.twoCol} className="psr-two">
                <Panel
                  title={`Sales by ${periodWord}`}
                  subtitle={`Green bar = best ${periodWord}. Hover a bar for details.`}
                  right={<Toggle value={trendMetric} onChange={setTrendMetric} options={[{ value: "net", label: "Sales" }, { value: "units", label: "Units" }, { value: "orders", label: "Orders" }]} />}
                  style={{ gridColumn: "span 2" }}
                >
                  <TrendChart data={report.trend} metric={trendMetric} />
                </Panel>
                <Panel title="Category share" subtitle="Net sales by product category">
                  <SplitBar rows={report.categories.slice(0, 8)} label={(r) => r.name} />
                </Panel>
              </div>

              {/* Top products + period leaders */}
              <div style={S.twoColEven}>
                <Panel
                  title="Top 10 products"
                  subtitle="Click a product for full details"
                  right={<Toggle value={topMetric} onChange={setTopMetric} options={[{ value: "net", label: "Sales" }, { value: "units", label: "Units" }, { value: "orders", label: "Orders" }]} />}
                >
                  <BarList
                    rows={[...report.products.filter((x) => x.orders > 0)].sort((a, b) => b[topMetric] - a[topMetric])}
                    value={(r) => r[topMetric]}
                    format={topMetric === "net" ? money0 : num}
                    label={(r) => r.name}
                    sub={(r) => `${r.category} · ${num(r.units)} units · ${r.orders} orders · ${r.share}%`}
                    onClick={openProduct}
                  />
                </Panel>
                <Panel title={`Best product each ${periodWord}`} subtitle="Which product led sales in every period">
                  <div style={{ maxHeight: 420, overflowY: "auto" }}>
                    {report.periodLeaders.length === 0 && <Empty />}
                    {[...report.periodLeaders].reverse().map((x) => (
                      <div key={x.key} style={S.leaderRow}>
                        <div style={{ width: 92, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: "#374151" }}>{x.label}</div>
                        {x.top ? (
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <button type="button" onClick={() => openProduct(x.top)} style={S.leaderName}>
                              <FiAward size={12} color="#16a34a" /> {x.top.name}
                            </button>
                            <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                              {money0(x.top.net)} · {num(x.top.units)} units · {x.share}% of {compact(x.total)}
                              {x.runnerUp ? ` · next: ${x.runnerUp.name} (${compact(x.runnerUp.net)})` : ""}
                            </div>
                          </div>
                        ) : (
                          <div style={{ flex: 1, fontSize: 12.5, color: "#9ca3af" }}>No sales</div>
                        )}
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              {/* Product × period matrix */}
              <Panel
                title={`Product performance by ${periodWord}`}
                subtitle={`Darker cell = higher ${matrixMetric === "units" ? "units" : "sales"}. Outlined cell = top product of that ${periodWord}.`}
                right={
                  <>
                    <Toggle value={matrixMetric} onChange={setMatrixMetric} options={[{ value: "net", label: "Sales" }, { value: "units", label: "Units" }]} />
                    {(matrix.hidden > 0 || matrixAll) && (
                      <button type="button" style={S.ghostBtn} onClick={() => setMatrixAll((v) => !v)}>
                        {matrixAll ? "Show top 20" : `Show all (${matrix.hidden} more)`}
                      </button>
                    )}
                  </>
                }
              >
                {matrix.rows.length === 0 ? <Empty /> : (
                  <div style={{ overflowX: "auto", border: "1px solid #eef0f3", borderRadius: 10 }}>
                    <table style={{ ...S.table, fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ ...S.th, ...S.stickyCol, textAlign: "left", minWidth: 190, background: "#f9fafb" }}>Product</th>
                          {matrix.cols.map((c) => <th key={c.key} style={{ ...S.th, whiteSpace: "nowrap" }}>{c.label.replace("Week of ", "")}</th>)}
                          <th style={{ ...S.th, color: "#111827" }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matrix.rows.map((r) => (
                          <tr key={r.productKey}>
                            <td style={{ ...S.td, ...S.stickyCol, background: "#fff" }}>
                              <button type="button" onClick={() => openProduct(r)} style={{ ...S.leaderName, fontSize: 12.5 }}>{r.name}</button>
                              <div style={{ fontSize: 10.5, color: "#9ca3af" }}>{r.category}</div>
                            </td>
                            {matrix.cols.map((c) => {
                              const v = r.buckets?.[c.key]?.[matrix.key] || 0;
                              const a = matrix.max ? v / matrix.max : 0;
                              const lead = matrix.leaders[c.key] === r.productKey;
                              return (
                                <td
                                  key={c.key}
                                  title={`${r.name} · ${c.label}: ${matrix.key === "units" ? `${num(v)} units` : money(v)}`}
                                  style={{
                                    ...S.tdNum, padding: "8px 10px", whiteSpace: "nowrap",
                                    background: v ? `rgba(99,102,241,${0.08 + a * 0.8})` : "transparent",
                                    color: a > 0.5 ? "#fff" : v ? "#1e1b4b" : "#d1d5db",
                                    fontWeight: lead ? 700 : 500,
                                    boxShadow: lead ? "inset 0 0 0 2px #22c55e" : "none",
                                  }}
                                >
                                  {v ? (matrix.key === "units" ? compactNum(v) : compact(v)) : "–"}
                                </td>
                              );
                            })}
                            <td style={{ ...S.tdNum, fontWeight: 700 }}>{matrix.key === "units" ? num(r.units) : money0(r.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td style={{ ...S.td, ...S.stickyCol, background: "#f9fafb", fontWeight: 700 }}>All products</td>
                          {matrix.colTotals.map((v, i) => (
                            <td key={matrix.cols[i].key} style={{ ...S.tdNum, background: "#f9fafb", fontWeight: 700, whiteSpace: "nowrap" }}>
                              {v ? (matrix.key === "units" ? compactNum(v) : compact(v)) : "–"}
                            </td>
                          ))}
                          <td style={{ ...S.tdNum, background: "#f9fafb", fontWeight: 800 }}>{matrix.key === "units" ? num(s.units) : money0(s.net)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Panel>

              {/* Full product table */}
              <Panel
                title="All products"
                subtitle={`${productRows.length} products with orders in this period · click a row for details`}
                right={
                  <span style={{ position: "relative" }}>
                    <FiSearch size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                    <input id="psr-prod-search" value={prodSearch} onChange={(e) => { setProdSearch(e.target.value); setProdPage(1); }} placeholder="Find product, SKU, category" style={{ ...S.input, paddingLeft: 30, width: 230, maxWidth: "100%" }} />
                  </span>
                }
              >
                <div style={{ overflowX: "auto", border: "1px solid #eef0f3", borderRadius: 10 }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={{ ...S.th, textAlign: "left", width: 36 }}>#</th>
                        <SortTh label="Product" k="name" sort={prodSort} setSort={setProdSort} align="left" />
                        <SortTh label="Orders" k="orders" sort={prodSort} setSort={setProdSort} />
                        <SortTh label="Units" k="units" sort={prodSort} setSort={setProdSort} />
                        <SortTh label="Customers" k="customers" sort={prodSort} setSort={setProdSort} />
                        <SortTh label="Avg price" k="avgPrice" sort={prodSort} setSort={setProdSort} />
                        <SortTh label="Taxable" k="taxable" sort={prodSort} setSort={setProdSort} />
                        <SortTh label="Net sales" k="net" sort={prodSort} setSort={setProdSort} />
                        <SortTh label="Share" k="share" sort={prodSort} setSort={setProdSort} />
                        {p && <SortTh label="vs prev" k="growth" sort={prodSort} setSort={setProdSort} />}
                        <th style={{ ...S.th, textAlign: "left" }}>Best {periodWord}</th>
                        <SortTh label="B2B / B2C" k="b2bNet" sort={prodSort} setSort={setProdSort} />
                        <SortTh label="Cancelled" k="cancelledValue" sort={prodSort} setSort={setProdSort} />
                        <SortTh label="Last sold" k="lastSold" sort={prodSort} setSort={setProdSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {productRows.slice((prodPage - 1) * PROD_PER, prodPage * PROD_PER).map((x) => (
                        <tr key={x.productKey} onClick={() => openProduct(x)} style={{ cursor: "pointer" }} className="psr-row">
                          <td style={{ ...S.td, color: "#9ca3af" }}>{x.rank || "—"}</td>
                          <td style={{ ...S.td, minWidth: 200 }}>
                            <div style={{ fontWeight: 600, color: "#111827" }}>{x.name}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{x.category}{x.sku ? ` · ${x.sku}` : ""}</div>
                          </td>
                          <td style={S.tdNum}>{num(x.orders)}</td>
                          <td style={S.tdNum}>{num(x.units)}</td>
                          <td style={S.tdNum}>{num(x.customers)}</td>
                          <td style={S.tdNum}>{money(x.avgPrice)}</td>
                          <td style={S.tdNum}>{money0(x.taxable)}</td>
                          <td style={{ ...S.tdNum, fontWeight: 700, color: "#111827" }}>{money0(x.net)}</td>
                          <td style={{ ...S.tdNum, minWidth: 90 }}>
                            <div style={{ fontSize: 12 }}>{x.share}%</div>
                            <div style={{ height: 4, background: "#f1f2f6", borderRadius: 4, marginTop: 3 }}>
                              <div style={{ width: `${Math.min(x.share, 100)}%`, height: "100%", background: "#6366f1", borderRadius: 4, marginLeft: "auto" }} />
                            </div>
                          </td>
                          {p && <td style={S.tdNum}>{x.orders ? <Delta value={x.growth} suffix="" /> : "—"}</td>}
                          <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                            {x.bestPeriod ? <><div>{x.bestPeriod}</div><div style={{ fontSize: 11, color: "#6b7280" }}>{compact(x.bestPeriodNet)}</div></> : "—"}
                          </td>
                          <td style={{ ...S.tdNum, whiteSpace: "nowrap", fontSize: 12 }}>
                            <div style={{ color: "#1d4ed8" }}>{compact(x.b2bNet)}</div>
                            <div style={{ color: "#15803d" }}>{compact(x.b2cNet)}</div>
                          </td>
                          <td style={{ ...S.tdNum, whiteSpace: "nowrap", color: x.cancelledOrders ? "#b91c1c" : "#9ca3af" }}>
                            {x.cancelledOrders ? <><div>{x.cancelledOrders} orders</div><div style={{ fontSize: 11 }}>{compact(x.cancelledValue)}</div></> : "—"}
                          </td>
                          <td style={{ ...S.td, whiteSpace: "nowrap", textAlign: "right" }}>{day(x.lastSold)}</td>
                        </tr>
                      ))}
                      {!productRows.length && <tr><td colSpan={14}><Empty /></td></tr>}
                    </tbody>
                  </table>
                </div>
                <Pager page={prodPage} pages={prodPages} setPage={setProdPage} total={productRows.length} per={PROD_PER} />
              </Panel>

              {/* Customers, states, splits */}
              <div style={S.threeCol}>
                <Panel title="Top customers" subtitle="By net sales in this period">
                  <BarList
                    rows={report.customers}
                    value={(r) => r.net}
                    format={money0}
                    label={(r) => r.name}
                    sub={(r) => `${r.type}${r.company ? ` · ${r.company}` : ""} · ${r.orders} orders · last ${day(r.lastOrder)}`}
                    color="#1d4ed8"
                  />
                </Panel>
                <Panel title="Top delivery states" subtitle="Where the orders are shipped">
                  <BarList rows={report.states} value={(r) => r.net} format={money0} label={(r) => r.name} sub={(r) => `${r.orders} orders · ${num(r.units)} units`} color="#0ea5e9" />
                </Panel>
                <Panel title="Sales mix">
                  <div style={{ display: "grid", gap: 20 }}>
                    <div>
                      <h4 style={S.subHead}>B2B vs B2C</h4>
                      <SplitBar rows={report.customerTypes} />
                    </div>
                    {canViewPayments && report.paymentMethods.length > 0 && (
                      <div>
                        <h4 style={S.subHead}>Payment method</h4>
                        <SplitBar rows={report.paymentMethods} />
                      </div>
                    )}
                    {canViewPayments && report.paymentStatuses.length > 0 && (
                      <div>
                        <h4 style={S.subHead}>Payment status</h4>
                        <SplitBar rows={report.paymentStatuses} />
                      </div>
                    )}
                    <div>
                      <h4 style={S.subHead}>Order status (all orders in range)</h4>
                      <SplitBar rows={report.statusBreakdown} value={(r) => r.orders} format={(v) => `${v} orders`} />
                    </div>
                  </div>
                </Panel>
              </div>

              {/* Not selling */}
              <Panel
                title="Products with no sales"
                subtitle="Published products that received no orders in this period, oldest last sale first"
                right={report.noSales.length > 10 && (
                  <button type="button" style={S.ghostBtn} onClick={() => setNoSalesAll((v) => !v)}>{noSalesAll ? "Show less" : `Show all ${report.noSales.length}`}</button>
                )}
              >
                {report.noSales.length === 0 ? <Empty text="Every published product sold at least once in this period." /> : (
                  <div style={{ overflowX: "auto", border: "1px solid #eef0f3", borderRadius: 10 }}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={{ ...S.th, textAlign: "left" }}>Product</th>
                          <th style={{ ...S.th, textAlign: "left" }}>Category</th>
                          <th style={{ ...S.th, textAlign: "left" }}>Listed for</th>
                          <th style={S.th}>Listed on</th>
                          <th style={S.th}>Last sold (ever)</th>
                          <th style={S.th}>Lifetime units</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.noSales.slice(0, noSalesAll ? undefined : 10).map((x) => (
                          <tr key={x.productId}>
                            <td style={{ ...S.td, fontWeight: 600 }}>{x.name}{x.sku && <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>{x.sku}</div>}</td>
                            <td style={S.td}>{x.category}</td>
                            <td style={S.td}>{(x.productFor || "").toUpperCase()}</td>
                            <td style={{ ...S.tdNum, whiteSpace: "nowrap" }}>{day(x.listedOn)}</td>
                            <td style={{ ...S.tdNum, whiteSpace: "nowrap", color: x.lastSold ? "#374151" : "#b91c1c" }}>{x.lastSold ? day(x.lastSold) : "Never sold"}</td>
                            <td style={S.tdNum}>{num(x.lifetimeUnits)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              {/* Order lines */}
              <Panel
                title="Order lines"
                subtitle="Every product line behind these numbers"
                right={
                  <span style={{ position: "relative" }}>
                    <FiSearch size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                    <input id="psr-line-search" value={lineSearch} onChange={(e) => { setLineSearch(e.target.value); setLinePage(1); }} placeholder="Search lines" style={{ ...S.input, paddingLeft: 30, width: 200, maxWidth: "100%" }} />
                  </span>
                }
              >
                <div style={{ overflowX: "auto", border: "1px solid #eef0f3", borderRadius: 10 }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={{ ...S.th, textAlign: "left" }}>Date</th>
                        <th style={{ ...S.th, textAlign: "left" }}>Order</th>
                        <th style={{ ...S.th, textAlign: "left" }}>Customer</th>
                        <th style={{ ...S.th, textAlign: "left" }}>Product</th>
                        <th style={S.th}>Qty</th>
                        <th style={S.th}>Unit price</th>
                        <th style={S.th}>GST</th>
                        <th style={S.th}>Net</th>
                        <th style={{ ...S.th, textAlign: "left" }}>Status</th>
                        {canViewPayments && <th style={{ ...S.th, textAlign: "left" }}>Payment</th>}
                        <th style={{ ...S.th, textAlign: "left" }}>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineRows.slice((linePage - 1) * LINE_PER, linePage * LINE_PER).map((l) => (
                        <tr key={`${l.orderId}-${l.lineNo}`}>
                          <td style={{ ...S.td, whiteSpace: "nowrap" }}>{dayTime(l.date)}</td>
                          <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                            <Link href={`/dashboard/admin/orders/${l.orderId}`} style={S.link}>#{l.orderNumber} <FiExternalLink size={11} /></Link>
                            {l.orderName && <div style={{ fontSize: 11, color: "#6b7280" }}>{l.orderName}</div>}
                          </td>
                          <td style={{ ...S.td, minWidth: 150 }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>{l.customerName} <TypeBadge type={l.customerType} /></div>
                            {l.company && <div style={{ fontSize: 11, color: "#6b7280" }}>{l.company}</div>}
                          </td>
                          <td style={{ ...S.td, minWidth: 180 }}>
                            <button type="button" onClick={() => openProduct(l)} style={{ ...S.leaderName, fontSize: 13 }}>{l.productName}</button>
                            {l.options && <div style={{ fontSize: 11, color: "#6b7280", maxWidth: 260 }}>{l.options}</div>}
                          </td>
                          <td style={S.tdNum}>{num(l.qty)}</td>
                          <td style={S.tdNum}>{money(l.price)}</td>
                          <td style={S.tdNum}>{money(l.gst)}</td>
                          <td style={{ ...S.tdNum, fontWeight: 700 }}>{money(l.net)}</td>
                          <td style={S.td}><StatusBadge status={l.status} /></td>
                          {canViewPayments && <td style={{ ...S.td, whiteSpace: "nowrap", fontSize: 12 }}>{l.paymentMethod}<div style={{ color: l.paymentStatus === "PAID" ? "#15803d" : "#b45309" }}>{l.paymentStatus}</div></td>}
                          <td style={S.td}>{l.state || "—"}</td>
                        </tr>
                      ))}
                      {!lineRows.length && <tr><td colSpan={11}><Empty /></td></tr>}
                    </tbody>
                  </table>
                </div>
                <Pager page={linePage} pages={linePages} setPage={setLinePage} total={lineRows.length} per={LINE_PER} />
              </Panel>

              <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "0 4px 8px" }}>
                How amounts are calculated: gross = quantity × unit price. Each order's discount, GST and total are shared across its product lines in
                proportion to their gross value, so product net sales add up exactly to order totals. Dates use Indian Standard Time.
              </p>
            </div>
          )}
        </div>
      </div>

      {drawer && report && <ProductDrawer product={drawer} report={report} onClose={() => setDrawer(null)} canViewPayments={canViewPayments} />}

      <style>{`
        @keyframes psr-spin { to { transform: rotate(360deg); } }
        .psr-row:hover td { background: #f8f9ff; }
        @media (max-width: 1100px) { .psr-two { grid-template-columns: 1fr !important; } .psr-two > section { grid-column: auto !important; } }
        @media (max-width: 640px) { .psr-span { grid-column: auto !important; } .psr-hide-xs { display: none; } }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
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

  presetRow: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #f1f2f6" },
  chip: { flexShrink: 0, padding: "6px 12px", borderRadius: 20, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12.5, fontWeight: 600, color: "#374151", cursor: "pointer" },
  chipOn: { background: "#6366f1", borderColor: "#6366f1", color: "#fff" },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em" },
  input: { height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 10px", fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box", minWidth: 0, width: "100%" },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 },
  kpi: { background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(15,23,42,0.06)", display: "grid", gap: 6, minWidth: 0 },
  kpiLabel: { fontSize: 12.5, color: "#6b7280", fontWeight: 600 },
  kpiIcon: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, flexShrink: 0 },
  kpiValue: { fontSize: 24, fontWeight: 800, letterSpacing: "-.01em", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" },
  delta: { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap" },
  deltaSuffix: { fontWeight: 500, opacity: 0.8 },

  insightGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 },
  insight: { display: "flex", gap: 12, alignItems: "flex-start", padding: 12, borderRadius: 10, background: "#fafbfc", border: "1px solid #f1f2f6", minWidth: 0 },

  twoCol: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 18 },
  twoColEven: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: 18 },
  threeCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 18 },

  toggle: { display: "inline-flex", background: "#f1f2f6", borderRadius: 8, padding: 3 },
  toggleBtn: { border: "none", background: "transparent", padding: "5px 11px", fontSize: 12, fontWeight: 600, color: "#6b7280", borderRadius: 6, cursor: "pointer" },
  toggleOn: { background: "#fff", color: "#111827", boxShadow: "0 1px 2px rgba(0,0,0,.08)" },

  tooltip: { position: "absolute", zIndex: 5, background: "#111827", color: "#fff", fontSize: 12, lineHeight: 1.55, padding: "9px 11px", borderRadius: 8, whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 6px 18px rgba(0,0,0,.18)" },

  leaderRow: { display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f3f4f6" },
  leaderName: { background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 600, color: "#111827", fontSize: 13.5, textAlign: "left", display: "inline-flex", gap: 6, alignItems: "center" },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "right", padding: "10px 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "#6b7280", borderBottom: "1px solid #eef0f3", background: "#f9fafb", whiteSpace: "nowrap", fontWeight: 700 },
  td: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle", color: "#374151" },
  tdNum: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#374151" },
  stickyCol: { position: "sticky", left: 0, zIndex: 1, borderRight: "1px solid #eef0f3" },
  badge: { display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" },
  link: { color: "#4f46e5", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 },
  empty: { padding: "28px 12px", textAlign: "center", color: "#9ca3af", fontSize: 13 },

  pager: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12, fontSize: 12.5 },
  pageBtn: { height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12.5 },

  ghostBtn: { height: 36, padding: "0 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#374151", display: "inline-flex", alignItems: "center", gap: 6 },
  exportBtn: { height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 },
  linkBtn: { background: "none", border: "none", color: "#6366f1", fontWeight: 600, fontSize: 12.5, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 },
  iconBtn: { background: "#f3f4f6", border: "none", borderRadius: 8, width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },

  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 1050, display: "flex", justifyContent: "flex-end" },
  drawer: { width: "min(640px, 100%)", height: "100%", background: "#fff", overflowY: "auto", boxShadow: "-10px 0 30px rgba(0,0,0,.15)" },
  drawerHead: { position: "sticky", top: 0, background: "#fff", zIndex: 2, padding: "18px 20px", borderBottom: "1px solid #eef0f3", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  miniGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 },
  mini: { background: "#fafbfc", border: "1px solid #f1f2f6", borderRadius: 10, padding: "9px 11px", minWidth: 0 },
  miniLabel: { fontSize: 10.5, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em" },
  miniValue: { fontSize: 14, fontWeight: 700, color: "#111827", marginTop: 2, overflowWrap: "anywhere" },
};
