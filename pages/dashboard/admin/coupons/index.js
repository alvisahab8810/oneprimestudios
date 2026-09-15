"use client";

// Admin coupons: manage coupons, see which coupon was used in which month and by how many
// customers, and follow up on abandoned carts. Data comes from /api/admin/coupons/report.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaWhatsapp } from "react-icons/fa";
import {
  FiTag, FiPlus, FiSearch, FiEdit2, FiTrash2, FiDownload, FiRefreshCw, FiX, FiUsers,
  FiShoppingCart, FiPercent, FiTrendingUp, FiTrendingDown, FiClock, FiMail, FiExternalLink,
  FiChevronDown, FiChevronRight, FiAlertTriangle, FiGift, FiBarChart2, FiCheckCircle,
} from "react-icons/fi";

/* ── Formatting ──────────────────────────────────────────────────────────── */
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0).toLocaleString("en-IN");
const TZ = "Asia/Kolkata";
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ }) : "—");
const dayTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TZ }) : "—";
const pad = (n) => String(n).padStart(2, "0");

function ago(d) {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const future = diff < 0;
  const h = Math.abs(diff) / 3600000;
  let txt;
  if (h < 1) txt = `${Math.max(1, Math.round(h * 60))} min`;
  else if (h < 24) txt = `${Math.round(h)} hr`;
  else if (h < 24 * 60) txt = `${Math.round(h / 24)} days`;
  else txt = `${Math.round(h / 24 / 30)} months`;
  return future ? `in ${txt}` : `${txt} ago`;
}

// Today's calendar date in IST as [year, month(1-12), day]
function istToday() {
  const x = new Date(Date.now() + 330 * 60000);
  return [x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()];
}
const ymd = (y, m, d) => {
  const t = new Date(Date.UTC(y, m - 1, d));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

const PRESETS = [
  { key: "this_month", label: "This month" },
  { key: "3m", label: "Last 3 months" },
  { key: "6m", label: "Last 6 months" },
  { key: "12m", label: "Last 12 months" },
  { key: "fy", label: "This FY" },
  { key: "this_year", label: "This year" },
  { key: "last_year", label: "Last year" },
];

function presetRange(key) {
  const [y, m, d] = istToday();
  const today = ymd(y, m, d);
  switch (key) {
    case "this_month": return { from: ymd(y, m, 1), to: today };
    case "3m": return { from: ymd(y, m - 2, 1), to: today };
    case "6m": return { from: ymd(y, m - 5, 1), to: today };
    case "fy": return { from: m >= 4 ? ymd(y, 4, 1) : ymd(y - 1, 4, 1), to: today };
    case "this_year": return { from: ymd(y, 1, 1), to: today };
    case "last_year": return { from: ymd(y - 1, 1, 1), to: ymd(y - 1, 12, 31) };
    default: return { from: ymd(y, m - 11, 1), to: today };
  }
}

const ABANDON_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 24, label: "24 hours" },
  { value: 72, label: "3 days" },
  { value: 168, label: "7 days" },
];

/* ── Coupon state ────────────────────────────────────────────────────────── */
function stateOf(c) {
  if (c.expiryDate && new Date(c.expiryDate) < new Date()) return "expired";
  if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit) return "limit_reached";
  if (!c.isActive) return "inactive";
  return "active";
}
const STATE_STYLE = {
  active: { label: "Active", bg: "#dcfce7", fg: "#166534" },
  inactive: { label: "Inactive", bg: "#f3f4f6", fg: "#4b5563" },
  expired: { label: "Expired", bg: "#fee2e2", fg: "#991b1b" },
  limit_reached: { label: "Limit reached", bg: "#fef3c7", fg: "#92400e" },
};
const discountText = (type, value) => (value == null ? "—" : type === "percentage" ? `${value}% off` : `${inr(value)} off`);

const COUPON_FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "expired", label: "Expired" },
  { key: "used", label: "Used" },
  { key: "unused", label: "Never used" },
];

const PAGE_SIZE = 10;

/* ── Small pieces ────────────────────────────────────────────────────────── */
function Badge({ bg, fg, children, title }) {
  return <span title={title} style={{ ...S.badge, background: bg, color: fg }}>{children}</span>;
}

function Delta({ cur, prev }) {
  if (prev == null) return null;
  if (!prev && !cur) return <span style={{ ...S.delta, background: "#f3f4f6", color: "#6b7280" }}>No change</span>;
  if (!prev) return <span style={{ ...S.delta, background: "#dcfce7", color: "#166534" }}>New</span>;
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  return (
    <span style={{ ...S.delta, background: up ? "#dcfce7" : "#fee2e2", color: up ? "#166534" : "#991b1b" }}>
      {up ? <FiTrendingUp size={11} /> : <FiTrendingDown size={11} />}
      {Math.abs(pct).toFixed(0)}% <span style={S.deltaSuffix}>vs previous</span>
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

function Switch({ on, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      style={{ ...S.switch, background: on ? "#22c55e" : "#d1d5db", opacity: disabled ? 0.5 : 1 }}
    >
      <span style={{ ...S.switchKnob, transform: on ? "translateX(18px)" : "translateX(0)" }} />
    </button>
  );
}

function Pager({ page, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  return (
    <div style={S.pager}>
      <span style={{ color: "#6b7280" }}>
        {num((page - 1) * PAGE_SIZE + 1)}–{num(Math.min(page * PAGE_SIZE, total))} of {num(total)}
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" style={{ ...S.pageBtn, opacity: page <= 1 ? 0.5 : 1 }} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span style={{ alignSelf: "center", padding: "0 4px" }}>Page {page} of {pages}</span>
        <button type="button" style={{ ...S.pageBtn, opacity: page >= pages ? 0.5 : 1 }} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

function Empty({ icon, title, text }) {
  return (
    <div style={S.empty}>
      <div style={{ color: "#c7cbd4", marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 700, color: "#4b5563", marginBottom: 4 }}>{title}</div>
      <div>{text}</div>
    </div>
  );
}

function BarList({ rows, valueKey, format, labelKey = "label", sub, color = "#6366f1" }) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey] || 0));
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((r, i) => (
        <div key={r.key || r.productId || r[labelKey] || i} style={{ minWidth: 0 }}>
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

// Monthly bars: coupon uses (solid) next to unique customers (light)
function MonthChart({ monthly }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...monthly.map((m) => Math.max(m.uses, m.uniqueUsers)));
  const top = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const ticks = [top, (top * 3) / 4, top / 2, top / 4, 0];
  const H = 190;
  return (
    <div>
      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#4b5563", marginBottom: 10, flexWrap: "wrap" }}>
        <span style={S.legend}><i style={{ ...S.legendDot, background: "#6366f1" }} /> Coupon uses</span>
        <span style={S.legend}><i style={{ ...S.legendDot, background: "#c7d2fe" }} /> Customers who used a coupon</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", minWidth: Math.max(monthly.length * 56, 320) }}>
          <div style={{ position: "relative", width: 30, height: H, flexShrink: 0 }}>
            {ticks.map((t) => (
              <span key={t} style={{ position: "absolute", right: 6, top: H - (t / top) * H - 7, fontSize: 10.5, color: "#9ca3af", fontVariantNumeric: "tabular-nums" }}>{t}</span>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ position: "relative", height: H, borderBottom: "1px solid #e5e7eb" }}>
              {ticks.slice(0, -1).map((t) => (
                <div key={t} style={{ position: "absolute", left: 0, right: 0, top: H - (t / top) * H, borderTop: "1px dashed #eef0f3" }} />
              ))}
              <div style={{ position: "absolute", inset: 0, display: "flex" }}>
                {monthly.map((m) => (
                  <div
                    key={m.key}
                    onMouseEnter={() => setHover(m.key)}
                    onMouseLeave={() => setHover(null)}
                    style={{ flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3, position: "relative", background: hover === m.key ? "rgba(99,102,241,.05)" : "transparent" }}
                  >
                    <div style={{ width: "32%", maxWidth: 18, height: `${(m.uses / top) * 100}%`, background: "#6366f1", borderRadius: "4px 4px 0 0", minHeight: m.uses ? 3 : 0 }} />
                    <div style={{ width: "32%", maxWidth: 18, height: `${(m.uniqueUsers / top) * 100}%`, background: "#c7d2fe", borderRadius: "4px 4px 0 0", minHeight: m.uniqueUsers ? 3 : 0 }} />
                    {hover === m.key && (
                      <div style={{ ...S.tooltip, bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6 }}>
                        <strong>{m.label}</strong><br />
                        Uses: {num(m.uses)}{m.cancelled ? ` (+${m.cancelled} cancelled)` : ""}<br />
                        Customers: {num(m.uniqueUsers)}<br />
                        Discount: {inr(m.discount)}<br />
                        {m.topCoupon ? `Top: ${m.topCoupon.code} (${m.topCoupon.uses})` : "No coupon used"}
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Coupon drawer ───────────────────────────────────────────────────────── */
function CouponDrawer({ coupon, report, onClose, onEdit }) {
  const usage = report.usage.find((u) => u.code === coupon.code);
  const orders = report.orders.filter((o) => o.code === coupon.code);
  const st = STATE_STYLE[stateOf(coupon)];
  const monthRows = report.months.map((m) => ({ key: m.key, label: m.label, uses: usage?.byMonth[m.key]?.uses || 0, users: usage?.byMonth[m.key]?.users || 0 }));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={S.overlay} onClick={onClose}>
      <aside style={S.drawer} onClick={(e) => e.stopPropagation()} aria-label={`Coupon ${coupon.code}`}>
        <div style={S.drawerHead}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={S.codeChip}>{coupon.code}</span>
              <Badge bg={st.bg} fg={st.fg}>{st.label}</Badge>
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>
              {discountText(coupon.discountType, coupon.discountValue)}
              {coupon.minOrderAmount ? ` · min order ${inr(coupon.minOrderAmount)}` : ""} · created {day(coupon.createdAt)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" style={S.iconBtn} onClick={() => onEdit(coupon)} aria-label="Edit coupon"><FiEdit2 size={15} /></button>
            <button type="button" style={S.iconBtn} onClick={onClose} aria-label="Close"><FiX size={16} /></button>
          </div>
        </div>

        <div style={{ padding: "18px 20px", display: "grid", gap: 20 }}>
          <div>
            <h4 style={S.subHead}>All-time performance</h4>
            <div style={S.miniGrid}>
              <div style={S.mini}><div style={S.miniLabel}>Orders</div><div style={S.miniValue}>{num(coupon.stats.orders)}</div></div>
              <div style={S.mini}><div style={S.miniLabel}>Customers</div><div style={S.miniValue}>{num(coupon.stats.uniqueUsers)}</div></div>
              <div style={S.mini}><div style={S.miniLabel}>Discount given</div><div style={S.miniValue}>{inr(coupon.stats.discount)}</div></div>
              <div style={S.mini}><div style={S.miniLabel}>Order value</div><div style={S.miniValue}>{inr(coupon.stats.revenue)}</div></div>
              <div style={S.mini}><div style={S.miniLabel}>Cancelled</div><div style={S.miniValue}>{num(coupon.stats.cancelled)}</div></div>
              <div style={S.mini}><div style={S.miniLabel}>Last used</div><div style={S.miniValue}>{day(coupon.stats.lastUsed)}</div></div>
            </div>
          </div>

          <div>
            <h4 style={S.subHead}>Rules</h4>
            <div style={S.miniGrid}>
              <div style={S.mini}><div style={S.miniLabel}>Expiry</div><div style={S.miniValue}>{coupon.expiryDate ? dayTime(coupon.expiryDate) : "No expiry"}</div></div>
              <div style={S.mini}><div style={S.miniLabel}>Per customer</div><div style={S.miniValue}>{coupon.perUserLimit || 1} time(s)</div></div>
              <div style={S.mini}><div style={S.miniLabel}>Total limit</div><div style={S.miniValue}>{coupon.usageLimit ? `${num(coupon.usedCount)} / ${num(coupon.usageLimit)}` : "Unlimited"}</div></div>
              <div style={S.mini}><div style={S.miniLabel}>For</div><div style={S.miniValue} className="text-capitalize">{(coupon.allowedUserTypes || []).join(", ") || "—"}</div></div>
            </div>
          </div>

          <div>
            <h4 style={S.subHead}>Uses by month ({report.range.from} to {report.range.to})</h4>
            {usage ? (
              <BarList rows={monthRows} valueKey="uses" format={(v) => `${num(v)} uses`} sub={(r) => (r.uses ? `${num(r.users)} customer${r.users === 1 ? "" : "s"}` : "")} />
            ) : (
              <Empty icon={<FiBarChart2 size={26} />} title="Not used in this period" text="Pick a wider date range to see older uses." />
            )}
          </div>

          <div>
            <h4 style={S.subHead}>Orders in this period</h4>
            {orders.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={{ ...S.th, textAlign: "left" }}>Order</th>
                      <th style={{ ...S.th, textAlign: "left" }}>Customer</th>
                      <th style={S.th}>Discount</th>
                      <th style={S.th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td style={S.td}>
                          <Link href={`/dashboard/admin/orders/${o.id}`} style={S.link}>#{o.orderNumber}</Link>
                          <div style={{ fontSize: 11.5, color: "#6b7280" }}>{day(o.date)} · {o.cancelled ? <span style={{ color: "#b91c1c" }}>{o.status}</span> : o.status}</div>
                        </td>
                        <td style={S.td}>
                          <div style={{ fontWeight: 600 }}>{o.customer.name}</div>
                          <div style={{ fontSize: 11.5, color: "#6b7280" }}>{o.customer.company || o.customer.email}</div>
                        </td>
                        <td style={S.tdNum}>{inr(o.discount)}</td>
                        <td style={S.tdNum}>{inr(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty icon={<FiShoppingCart size={26} />} title="No orders" text="No order used this coupon in the selected period." />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ── Edit modal ──────────────────────────────────────────────────────────── */
// datetime-local value in the browser's local time
function toLocalInput(d) {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x)) return "";
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

function EditModal({ coupon, onClose, onSaved }) {
  const [form, setForm] = useState({
    discountValue: coupon.discountValue ?? "",
    minOrderAmount: coupon.minOrderAmount ?? "",
    expiryDate: toLocalInput(coupon.expiryDate),
    perUserLimit: coupon.perUserLimit ?? 1,
    allowedUserTypes: coupon.allowedUserTypes || [],
    isActive: !!coupon.isActive,
  });
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async (e) => {
    e.preventDefault();
    const value = Number(form.discountValue);
    if (!(value > 0)) return toast.error("Enter a discount value greater than 0");
    if (coupon.discountType === "percentage" && value > 100) return toast.error("A percentage discount cannot be more than 100");
    if (!form.allowedUserTypes.length) return toast.error("Select at least one user type");
    if (!(Number(form.perUserLimit) >= 1)) return toast.error("Per customer limit must be at least 1");

    const payload = {
      id: coupon._id,
      discountValue: value,
      minOrderAmount: form.minOrderAmount === "" ? 0 : Number(form.minOrderAmount),
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
      perUserLimit: Number(form.perUserLimit),
      allowedUserTypes: form.allowedUserTypes,
      isActive: form.isActive,
    };
    try {
      setSaving(true);
      await axios.put("/api/admin/coupons/update", payload, { withCredentials: true });
      toast.success("Coupon updated");
      onSaved({ ...coupon, ...payload, _id: coupon._id });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update the coupon");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ ...S.overlay, justifyContent: "center", alignItems: "center", padding: 16 }} onClick={onClose}>
      <form style={S.modal} onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div style={{ ...S.drawerHead, position: "static" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Edit coupon</div>
            <div style={{ marginTop: 6 }}><span style={S.codeChip}>{coupon.code}</span> <span style={{ fontSize: 12.5, color: "#6b7280" }}>{coupon.discountType === "percentage" ? "Percentage" : "Flat amount"}</span></div>
          </div>
          <button type="button" style={S.iconBtn} onClick={onClose} aria-label="Close"><FiX size={16} /></button>
        </div>

        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <label style={S.field}>
            <span style={S.fieldLabel}>Discount {coupon.discountType === "percentage" ? "(%)" : "(₹)"}</span>
            <input id="edit-discount" type="number" min="0" step="any" style={S.input} value={form.discountValue} onChange={(e) => set({ discountValue: e.target.value })} />
          </label>
          <label style={S.field}>
            <span style={S.fieldLabel}>Minimum order (₹)</span>
            <input id="edit-min-order" type="number" min="0" step="any" style={S.input} value={form.minOrderAmount} onChange={(e) => set({ minOrderAmount: e.target.value })} />
          </label>
          <label style={S.field}>
            <span style={S.fieldLabel}>Expires on</span>
            <input id="edit-expiry" type="datetime-local" style={S.input} value={form.expiryDate} onChange={(e) => set({ expiryDate: e.target.value })} />
          </label>
          <label style={S.field}>
            <span style={S.fieldLabel}>Uses per customer</span>
            <input id="edit-per-user" type="number" min="1" style={S.input} value={form.perUserLimit} onChange={(e) => set({ perUserLimit: e.target.value })} />
          </label>

          <div style={{ ...S.field, gridColumn: "1 / -1" }}>
            <span style={S.fieldLabel}>Who can use it</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["customer", "partner"].map((t) => {
                const on = form.allowedUserTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set({ allowedUserTypes: on ? form.allowedUserTypes.filter((x) => x !== t) : [...form.allowedUserTypes, t] })}
                    style={{ ...S.chip, ...(on ? S.chipOn : {}) }}
                    aria-pressed={on}
                  >
                    {on && <FiCheckCircle size={12} style={{ marginRight: 5, verticalAlign: -1 }} />}
                    {t === "customer" ? "Customers" : "Partners"}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10 }}>
            <Switch on={form.isActive} onChange={() => set({ isActive: !form.isActive })} label="Coupon is active" />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{form.isActive ? "Active: customers can apply it" : "Inactive: hidden from checkout"}</span>
          </div>
        </div>

        <div style={{ padding: "14px 20px", borderTop: "1px solid #eef0f3", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" style={S.ghostBtn} onClick={onClose}>Cancel</button>
          <button type="submit" style={{ ...S.primaryBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function AdminCoupons() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState("coupons");

  const [filters, setFilters] = useState(() => ({ preset: "12m", ...presetRange("12m"), userType: "", abandonHours: 24 }));
  const [report, setReport] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [drawer, setDrawer] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Coupons tab
  const [search, setSearch] = useState("");
  const [couponFilter, setCouponFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [couponPage, setCouponPage] = useState(1);

  // Monthly tab
  const [heatMetric, setHeatMetric] = useState("uses");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(1);

  // Carts tab
  const [cartSearch, setCartSearch] = useState("");
  const [cartSort, setCartSort] = useState("value");
  const [cartPage, setCartPage] = useState(1);
  const [openCart, setOpenCart] = useState(null);

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const applyPreset = (key) => set({ preset: key, ...presetRange(key) });

  useEffect(() => {
    if (!filters.from || !filters.to) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    axios
      .get("/api/admin/coupons/report", {
        params: { from: filters.from, to: filters.to, userType: filters.userType || undefined, abandonHours: filters.abandonHours },
        withCredentials: true,
      })
      .then((res) => {
        if (cancelled) return;
        setReport(res.data);
        setCoupons(res.data.coupons || []);
        setOrderPage(1);
        setCartPage(1);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err?.response?.data?.message || "Could not load coupon data";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [filters.from, filters.to, filters.userType, filters.abandonHours, reloadKey]);

  /* ── Coupon actions ── */
  const toggleStatus = async (c) => {
    setBusyId(c._id);
    setCoupons((prev) => prev.map((x) => (x._id === c._id ? { ...x, isActive: !c.isActive } : x)));
    try {
      await axios.put("/api/admin/coupons/update", { id: c._id, isActive: !c.isActive }, { withCredentials: true });
      toast.success(`${c.code} ${c.isActive ? "deactivated" : "activated"}`);
    } catch (err) {
      setCoupons((prev) => prev.map((x) => (x._id === c._id ? { ...x, isActive: c.isActive } : x)));
      toast.error(err?.response?.data?.message || "Could not change the status");
    } finally {
      setBusyId(null);
    }
  };

  const deleteCoupon = async (c) => {
    if (c.usedCount > 0) return toast.error("A used coupon cannot be deleted. Deactivate it instead.");
    if (!window.confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return;
    setBusyId(c._id);
    try {
      await axios.delete("/api/admin/coupons/delete", { data: { id: c._id }, withCredentials: true });
      setCoupons((prev) => prev.filter((x) => x._id !== c._id));
      toast.success("Coupon deleted");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the coupon");
    } finally {
      setBusyId(null);
    }
  };

  const onSaved = (updated) => {
    setCoupons((prev) => prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
    setDrawer((d) => (d && d._id === updated._id ? { ...d, ...updated } : d));
    setEditing(null);
  };

  /* ── Derived: coupons tab ── */
  const couponCounts = useMemo(() => {
    const out = { all: coupons.length, active: 0, inactive: 0, expired: 0, used: 0, unused: 0 };
    coupons.forEach((c) => {
      const s = stateOf(c);
      if (s === "active") out.active++;
      if (s === "inactive") out.inactive++;
      if (s === "expired") out.expired++;
      if (c.usedCount > 0) out.used++; else out.unused++;
    });
    return out;
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    const q = search.trim().toUpperCase();
    const list = coupons.filter((c) => {
      if (q && !c.code.includes(q)) return false;
      const s = stateOf(c);
      if (couponFilter === "active") return s === "active";
      if (couponFilter === "inactive") return s === "inactive";
      if (couponFilter === "expired") return s === "expired";
      if (couponFilter === "used") return c.usedCount > 0;
      if (couponFilter === "unused") return !c.usedCount;
      return true;
    });
    const sorters = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      most_used: (a, b) => (b.stats?.orders || 0) - (a.stats?.orders || 0),
      discount: (a, b) => (b.stats?.discount || 0) - (a.stats?.discount || 0),
      expiry: (a, b) => (a.expiryDate ? new Date(a.expiryDate) : Infinity) - (b.expiryDate ? new Date(b.expiryDate) : Infinity),
      code: (a, b) => a.code.localeCompare(b.code),
    };
    return list.sort(sorters[sortBy] || sorters.newest);
  }, [coupons, search, couponFilter, sortBy]);

  /* ── Derived: monthly tab ── */
  const heatMax = useMemo(() => {
    if (!report) return 1;
    let m = 1;
    report.usage.forEach((u) => Object.values(u.byMonth).forEach((c) => { m = Math.max(m, c[heatMetric] || 0); }));
    return m;
  }, [report, heatMetric]);

  const filteredOrders = useMemo(() => {
    if (!report) return [];
    const q = orderSearch.trim().toLowerCase();
    if (!q) return report.orders;
    return report.orders.filter((o) =>
      [o.orderNumber, o.code, o.customer.name, o.customer.company, o.customer.email, o.customer.phone].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [report, orderSearch]);

  /* ── Derived: carts tab ── */
  const filteredCarts = useMemo(() => {
    if (!report) return [];
    const q = cartSearch.trim().toLowerCase();
    const list = report.abandoned.carts.filter(
      (c) => !q || [c.customer.name, c.customer.company, c.customer.email, c.customer.phone, ...c.items.map((i) => i.name)].some((v) => String(v || "").toLowerCase().includes(q))
    );
    const sorters = {
      value: (a, b) => b.value - a.value,
      recent: (a, b) => new Date(b.lastActivity) - new Date(a.lastActivity),
      oldest: (a, b) => new Date(a.lastActivity) - new Date(b.lastActivity),
    };
    return [...list].sort(sorters[cartSort]);
  }, [report, cartSearch, cartSort]);

  /* ── Export ── */
  const exportExcel = () => {
    if (!report) return;
    const wb = XLSX.utils.book_new();
    const add = (name, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No data" }]), name);

    add("Coupons", filteredCoupons.map((c) => ({
      Code: c.code,
      Status: STATE_STYLE[stateOf(c)].label,
      Type: c.discountType,
      Value: c.discountValue,
      "Min order": c.minOrderAmount || 0,
      "Per customer limit": c.perUserLimit || 1,
      "For": (c.allowedUserTypes || []).join(", "),
      "Expiry": c.expiryDate ? dayTime(c.expiryDate) : "No expiry",
      "Usage counter": c.usedCount || 0,
      "Orders (all time)": c.stats?.orders || 0,
      "Cancelled orders": c.stats?.cancelled || 0,
      "Customers (all time)": c.stats?.uniqueUsers || 0,
      "Discount given": c.stats?.discount || 0,
      "Order value": c.stats?.revenue || 0,
      "Last used": c.stats?.lastUsed ? day(c.stats.lastUsed) : "",
      Created: day(c.createdAt),
    })));

    add("Monthly summary", report.monthly.map((m) => ({
      Month: m.label,
      "Coupon uses": m.uses,
      Customers: m.uniqueUsers,
      "Coupons used": m.couponsUsed,
      "Top coupon": m.topCoupon ? `${m.topCoupon.code} (${m.topCoupon.uses})` : "",
      "Discount given": m.discount,
      "Order value": m.revenue,
      "Cancelled uses": m.cancelled,
    })));

    const matrix = [];
    report.usage.forEach((u) => {
      const uses = { Coupon: u.code, Measure: "Uses" };
      const users = { Coupon: u.code, Measure: "Customers" };
      const disc = { Coupon: u.code, Measure: "Discount (₹)" };
      report.months.forEach((m) => {
        uses[m.label] = u.byMonth[m.key]?.uses || 0;
        users[m.label] = u.byMonth[m.key]?.users || 0;
        disc[m.label] = u.byMonth[m.key]?.discount || 0;
      });
      uses.Total = u.uses; users.Total = u.uniqueUsers; disc.Total = u.discount;
      matrix.push(uses, users, disc);
    });
    add("Coupon by month", matrix);

    add("Coupon orders", report.orders.map((o) => ({
      Date: dayTime(o.date),
      Order: o.orderNumber,
      Coupon: o.code,
      Customer: o.customer.name,
      Company: o.customer.company,
      Email: o.customer.email,
      Phone: o.customer.phone,
      "User type": o.customer.userType,
      Status: o.status,
      Payment: o.paymentStatus,
      Subtotal: o.subtotal,
      Discount: o.discount,
      Total: o.total,
    })));

    add("Abandoned carts", report.abandoned.carts.map((c) => ({
      Customer: c.customer.name,
      Company: c.customer.company,
      Email: c.customer.email,
      Phone: c.customer.phone,
      "User type": c.customer.userType,
      Products: c.items.map((i) => `${i.name} x ${i.quantity}`).join(" | "),
      "Cart value": c.value,
      "Last activity": dayTime(c.lastActivity),
      "Days idle": Math.floor(c.ageHours / 24),
      "Orders ever": c.ordersEver,
      "Ordered since": c.orderedSince ? "Yes" : "No",
    })));

    const [y, m, d] = istToday();
    XLSX.writeFile(wb, `coupons-report_${y}-${pad(m)}-${pad(d)}.xlsx`);
  };

  const s = report?.summary;
  const ab = report?.abandoned;
  const TABS = [
    { key: "coupons", label: "Coupons", count: coupons.length, icon: <FiTag size={14} /> },
    { key: "monthly", label: "Monthly usage", count: s?.uses, icon: <FiBarChart2 size={14} /> },
    { key: "carts", label: "Abandoned carts", count: ab?.summary.carts, icon: <FiShoppingCart size={14} /> },
  ];

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area" style={{ flex: 1, minWidth: 0, background: "#f6f7fb" }}>
        <nav style={S.topbar}>
          <button type="button" onClick={() => setSidebarOpen((v) => !v)} style={S.burger} aria-label="Toggle sidebar">☰</button>
          <FiGift size={18} style={{ marginRight: 8, color: "#6366f1", flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.2 }}>Coupons</div>
            <div style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {report ? `${day(report.range.from)} – ${day(report.range.to)}` : "Loading…"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} style={S.ghostBtn} title="Refresh" aria-label="Refresh" disabled={loading}>
              <FiRefreshCw size={14} style={loading ? { animation: "cpn-spin 1s linear infinite" } : undefined} />
            </button>
            <button type="button" onClick={exportExcel} disabled={!report || loading} style={{ ...S.exportBtn, opacity: !report || loading ? 0.6 : 1 }}>
              <FiDownload size={14} /> <span className="cpn-hide-xs">Export Excel</span>
            </button>
            <Link href="/dashboard/admin/coupons/create" style={S.primaryBtn}>
              <FiPlus size={15} /> <span className="cpn-hide-xs">Create coupon</span>
            </Link>
          </div>
        </nav>

        <div style={S.body}>
          {/* Period + filters */}
          <section style={S.panel}>
            <div style={S.presetRow}>
              {PRESETS.map((p) => (
                <button key={p.key} type="button" onClick={() => applyPreset(p.key)} style={{ ...S.chip, ...(filters.preset === p.key ? S.chipOn : {}) }}>{p.label}</button>
              ))}
              <button type="button" onClick={() => set({ preset: "custom" })} style={{ ...S.chip, ...(filters.preset === "custom" ? S.chipOn : {}) }}>Custom</button>
            </div>
            <div style={S.filterGrid}>
              <label style={S.field}>
                <span style={S.fieldLabel}>From</span>
                <input id="flt-from" type="date" style={S.input} value={filters.from} max={filters.to} onChange={(e) => set({ preset: "custom", from: e.target.value })} />
              </label>
              <label style={S.field}>
                <span style={S.fieldLabel}>To</span>
                <input id="flt-to" type="date" style={S.input} value={filters.to} min={filters.from} onChange={(e) => set({ preset: "custom", to: e.target.value })} />
              </label>
              <label style={S.field}>
                <span style={S.fieldLabel}>Customer type</span>
                <select id="flt-user-type" style={S.input} value={filters.userType} onChange={(e) => set({ userType: e.target.value })}>
                  <option value="">All customers</option>
                  <option value="customer">Customers (B2C)</option>
                  <option value="partner">Partners (B2B)</option>
                </select>
              </label>
              <label style={S.field}>
                <span style={S.fieldLabel}>Cart counts as abandoned after</span>
                <select id="flt-abandon" style={S.input} value={filters.abandonHours} onChange={(e) => set({ abandonHours: Number(e.target.value) })}>
                  {ABANDON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label} idle</option>)}
                </select>
              </label>
            </div>
          </section>

          {error && !report && (
            <section style={{ ...S.panel, borderColor: "#fecaca", background: "#fff5f5", display: "flex", gap: 10, alignItems: "center" }}>
              <FiAlertTriangle color="#dc2626" /> <span style={{ flex: 1 }}>{error}</span>
              <button type="button" style={S.ghostBtn} onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
            </section>
          )}

          {/* Headline numbers */}
          {s ? (
            <div style={{ ...S.kpiGrid, opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
              <Kpi icon={<FiTag size={15} />} tint={["#eef2ff", "#4f46e5"]} label="Coupon uses" value={num(s.uses)} sub={s.cancelledUses ? `${num(s.cancelledUses)} more were cancelled` : `${num(s.couponsUsed)} different coupons`}>
                <Delta cur={s.uses} prev={s.prev.uses} />
              </Kpi>
              <Kpi icon={<FiUsers size={15} />} tint={["#ecfeff", "#0e7490"]} label="Customers who used a coupon" value={num(s.uniqueUsers)} sub="Counted once, however many uses">
                <Delta cur={s.uniqueUsers} prev={s.prev.uniqueUsers} />
              </Kpi>
              <Kpi icon={<FiPercent size={15} />} tint={["#fef3c7", "#b45309"]} label="Discount given" value={inr(s.discount)} sub={s.uses ? `Avg ${inr(s.avgDiscount)} per order · ${s.discountPct}% of subtotal` : "No discounts in this period"}>
                <Delta cur={s.discount} prev={s.prev.discount} />
              </Kpi>
              <Kpi icon={<FiCheckCircle size={15} />} tint={["#dcfce7", "#15803d"]} label="Orders with a coupon" value={`${s.adoptionPct}%`} sub={`${num(s.uses)} of ${num(s.totalOrders)} orders`} />
              <Kpi icon={<FiShoppingCart size={15} />} tint={["#fee2e2", "#b91c1c"]} label="Abandoned carts" value={num(ab.summary.carts)} sub={`${inr(ab.summary.value)} left in carts`} />
              <Kpi icon={<FiGift size={15} />} tint={["#f3e8ff", "#7e22ce"]} label="Live coupons" value={`${num(couponCounts.active)} / ${num(coupons.length)}`} sub={s.expiringSoon ? `${s.expiringSoon} expiring within 7 days` : "None expiring this week"} />
            </div>
          ) : loading ? (
            <div style={S.kpiGrid}>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ ...S.kpi, height: 112 }} className="cpn-skeleton" />)}</div>
          ) : null}

          {/* Tabs */}
          <div style={S.tabs} role="tablist">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} style={{ ...S.tab, ...(tab === t.key ? S.tabOn : {}) }}>
                {t.icon} {t.label}
                {t.count != null && <span style={{ ...S.tabCount, ...(tab === t.key ? { background: "#eef2ff", color: "#4f46e5" } : {}) }}>{num(t.count)}</span>}
              </button>
            ))}
          </div>

          {/* ── Coupons tab ── */}
          {tab === "coupons" && (
            <section style={S.panel}>
              <div style={S.panelHead}>
                <div>
                  <h3 style={S.panelTitle}>All coupons</h3>
                  <div style={S.panelSub}>Usage and discount figures are all-time and leave out cancelled orders.</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <FiSearch size={14} style={{ position: "absolute", left: 10, top: 12, color: "#9ca3af" }} />
                    <input id="cpn-search" style={{ ...S.input, paddingLeft: 30, width: 220 }} placeholder="Search coupon code" value={search} onChange={(e) => { setSearch(e.target.value); setCouponPage(1); }} />
                  </div>
                  <select id="cpn-sort" style={{ ...S.input, width: 170 }} value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort coupons">
                    <option value="newest">Newest first</option>
                    <option value="most_used">Most used</option>
                    <option value="discount">Most discount given</option>
                    <option value="expiry">Expiring first</option>
                    <option value="code">Code A–Z</option>
                  </select>
                </div>
              </div>

              <div style={{ ...S.presetRow, borderBottom: "none", marginBottom: 4 }}>
                {COUPON_FILTERS.map((f) => (
                  <button key={f.key} type="button" onClick={() => { setCouponFilter(f.key); setCouponPage(1); }} style={{ ...S.chip, ...(couponFilter === f.key ? S.chipOn : {}) }}>
                    {f.label} <span style={{ opacity: 0.7, marginLeft: 3 }}>{couponCounts[f.key]}</span>
                  </button>
                ))}
              </div>

              {!report && loading ? (
                <div style={{ height: 240 }} className="cpn-skeleton" />
              ) : filteredCoupons.length === 0 ? (
                <Empty icon={<FiTag size={30} />} title="No coupons match" text={coupons.length ? "Try another search or filter." : "Create your first coupon to get started."} />
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={{ ...S.th, textAlign: "left" }}>Coupon</th>
                          <th style={{ ...S.th, textAlign: "left" }}>Offer</th>
                          <th style={S.th}>Uses</th>
                          <th style={S.th}>Customers</th>
                          <th style={S.th}>Discount given</th>
                          <th style={{ ...S.th, textAlign: "left" }}>Expiry</th>
                          <th style={{ ...S.th, textAlign: "center" }}>Active</th>
                          <th style={{ ...S.th, textAlign: "center" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCoupons.slice((couponPage - 1) * PAGE_SIZE, couponPage * PAGE_SIZE).map((c) => {
                          const st = STATE_STYLE[stateOf(c)];
                          const expired = stateOf(c) === "expired";
                          const limitPct = c.usageLimit ? Math.min(100, ((c.usedCount || 0) / c.usageLimit) * 100) : null;
                          return (
                            <tr key={c._id} className="cpn-row">
                              <td style={S.td}>
                                <button type="button" style={S.codeBtn} onClick={() => setDrawer(c)} title="View usage">
                                  <span style={S.codeChip}>{c.code}</span>
                                </button>
                                <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                                  <Badge bg={st.bg} fg={st.fg}>{st.label}</Badge>
                                  {(c.allowedUserTypes || []).map((t) => <Badge key={t} bg="#f5f3ff" fg="#6d28d9">{t === "partner" ? "Partners" : "Customers"}</Badge>)}
                                </div>
                              </td>
                              <td style={S.td}>
                                <div style={{ fontWeight: 700, color: "#111827" }}>{discountText(c.discountType, c.discountValue)}</div>
                                <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                                  {c.minOrderAmount ? `Min order ${inr(c.minOrderAmount)}` : "No minimum"} · {c.perUserLimit || 1}× per customer
                                </div>
                              </td>
                              <td style={S.tdNum}>
                                <div style={{ fontWeight: 700, color: "#111827" }}>{num(c.stats?.orders)}</div>
                                {c.stats?.cancelled ? <div style={{ fontSize: 11.5, color: "#b91c1c" }}>+{c.stats.cancelled} cancelled</div> : null}
                                {limitPct != null && (
                                  <div title={`${c.usedCount} of ${c.usageLimit} allowed`} style={{ marginTop: 4, marginLeft: "auto", width: 70, height: 5, background: "#f1f2f6", borderRadius: 4, overflow: "hidden" }}>
                                    <div style={{ width: `${limitPct}%`, height: "100%", background: limitPct >= 100 ? "#f59e0b" : "#6366f1" }} />
                                  </div>
                                )}
                              </td>
                              <td style={S.tdNum}>{num(c.stats?.uniqueUsers)}</td>
                              <td style={S.tdNum}>
                                {inr(c.stats?.discount)}
                                {c.stats?.lastUsed && <div style={{ fontSize: 11.5, color: "#6b7280" }}>last used {ago(c.stats.lastUsed)}</div>}
                              </td>
                              <td style={S.td}>
                                {c.expiryDate ? (
                                  <>
                                    <div style={{ whiteSpace: "nowrap" }}>{day(c.expiryDate)}</div>
                                    <div style={{ fontSize: 11.5, color: expired ? "#b91c1c" : "#6b7280", whiteSpace: "nowrap" }}>{expired ? `ended ${ago(c.expiryDate)}` : `ends ${ago(c.expiryDate)}`}</div>
                                  </>
                                ) : (
                                  <span style={{ color: "#6b7280" }}>No expiry</span>
                                )}
                              </td>
                              <td style={{ ...S.td, textAlign: "center" }}>
                                <Switch on={!!c.isActive} disabled={busyId === c._id} onChange={() => toggleStatus(c)} label={`${c.code} active`} />
                              </td>
                              <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                                <button type="button" style={S.actionBtn} onClick={() => setDrawer(c)} title="View usage" aria-label={`View usage of ${c.code}`}><FiBarChart2 size={14} /></button>
                                <button type="button" style={S.actionBtn} onClick={() => setEditing(c)} title="Edit" aria-label={`Edit ${c.code}`}><FiEdit2 size={14} /></button>
                                <button
                                  type="button"
                                  style={{ ...S.actionBtn, color: "#dc2626", opacity: c.usedCount > 0 || busyId === c._id ? 0.35 : 1, cursor: c.usedCount > 0 ? "not-allowed" : "pointer" }}
                                  onClick={() => deleteCoupon(c)}
                                  title={c.usedCount > 0 ? "Used coupons cannot be deleted" : "Delete"}
                                  aria-label={`Delete ${c.code}`}
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pager page={couponPage} total={filteredCoupons.length} onPage={setCouponPage} />
                </>
              )}
            </section>
          )}

          {/* ── Monthly usage tab ── */}
          {tab === "monthly" && report && (
            <>
              <section style={S.panel}>
                <div style={S.panelHead}>
                  <div>
                    <h3 style={S.panelTitle}>Coupon uses by month</h3>
                    <div style={S.panelSub}>Hover a month to see its top coupon. Cancelled orders are not counted.</div>
                  </div>
                </div>
                <MonthChart monthly={report.monthly} />
              </section>

              <section style={S.panel}>
                <div style={S.panelHead}>
                  <div>
                    <h3 style={S.panelTitle}>Which coupon ran in which month</h3>
                    <div style={S.panelSub}>Each cell shows the uses and how many customers used it. Darker means more.</div>
                  </div>
                  <div style={S.toggle}>
                    {[["uses", "Uses"], ["users", "Customers"], ["discount", "Discount"]].map(([k, l]) => (
                      <button key={k} type="button" onClick={() => setHeatMetric(k)} style={{ ...S.toggleBtn, ...(heatMetric === k ? S.toggleOn : {}) }}>{l}</button>
                    ))}
                  </div>
                </div>
                {report.usage.length === 0 ? (
                  <Empty icon={<FiBarChart2 size={30} />} title="No coupon was used in this period" text="Pick a wider date range above." />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ ...S.table, fontSize: 12.5 }}>
                      <thead>
                        <tr>
                          <th style={{ ...S.th, ...S.stickyCol, textAlign: "left", minWidth: 150 }}>Coupon</th>
                          {report.months.map((m) => <th key={m.key} style={{ ...S.th, textAlign: "center", minWidth: 74 }}>{m.label.replace(" 20", " '")}</th>)}
                          <th style={{ ...S.th, minWidth: 90 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.usage.map((u) => {
                          const known = coupons.find((c) => c.code === u.code);
                          return (
                            <tr key={u.code}>
                              <td style={{ ...S.td, ...S.stickyCol, background: "#fff" }}>
                                {known ? (
                                  <button type="button" style={S.codeBtn} onClick={() => setDrawer(known)}><span style={S.codeChip}>{u.code}</span></button>
                                ) : (
                                  <span style={{ ...S.codeChip, opacity: 0.7 }} title="This coupon has been deleted">{u.code}</span>
                                )}
                                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{u.deleted ? "Deleted coupon" : discountText(u.discountType, u.discountValue)}</div>
                              </td>
                              {report.months.map((m) => {
                                const cell = u.byMonth[m.key];
                                const v = cell?.[heatMetric] || 0;
                                const a = v ? 0.12 + (v / heatMax) * 0.78 : 0;
                                return (
                                  <td
                                    key={m.key}
                                    title={cell ? `${u.code} · ${m.label}\n${cell.uses} uses · ${cell.users} customers · ${inr(cell.discount)} discount${cell.cancelled ? ` · ${cell.cancelled} cancelled` : ""}` : `${u.code} · ${m.label}: not used`}
                                    style={{ padding: 4, borderBottom: "1px solid #f3f4f6", textAlign: "center" }}
                                  >
                                    <div style={{ borderRadius: 6, padding: "6px 2px", background: v ? `rgba(79,70,229,${a})` : "#fafbfc", color: a > 0.5 ? "#fff" : v ? "#312e81" : "#c7cbd4", fontVariantNumeric: "tabular-nums" }}>
                                      <div style={{ fontWeight: 700 }}>{v ? (heatMetric === "discount" ? inr(v) : num(v)) : "·"}</div>
                                      {cell?.uses > 0 && heatMetric !== "users" && <div style={{ fontSize: 10, opacity: 0.85 }}>{cell.users} cust.</div>}
                                    </div>
                                  </td>
                                );
                              })}
                              <td style={{ ...S.tdNum, fontWeight: 700, color: "#111827" }}>
                                {heatMetric === "discount" ? inr(u.discount) : heatMetric === "users" ? num(u.uniqueUsers) : num(u.uses)}
                                {u.cancelled > 0 && <div style={{ fontSize: 11, color: "#b91c1c", fontWeight: 500 }}>+{u.cancelled} cancelled</div>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section style={S.panel}>
                <div style={S.panelHead}>
                  <div>
                    <h3 style={S.panelTitle}>Month by month</h3>
                    <div style={S.panelSub}>Totals for each month in the selected period.</div>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={{ ...S.th, textAlign: "left" }}>Month</th>
                        <th style={S.th}>Uses</th>
                        <th style={S.th}>Customers</th>
                        <th style={S.th}>Coupons used</th>
                        <th style={{ ...S.th, textAlign: "left" }}>Top coupon</th>
                        <th style={S.th}>Discount given</th>
                        <th style={S.th}>Order value</th>
                        <th style={S.th}>Cancelled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...report.monthly].reverse().map((m) => (
                        <tr key={m.key} className="cpn-row" style={{ opacity: m.uses || m.cancelled ? 1 : 0.55 }}>
                          <td style={{ ...S.td, fontWeight: 600, color: "#111827" }}>{m.label}</td>
                          <td style={S.tdNum}>{num(m.uses)}</td>
                          <td style={S.tdNum}>{num(m.uniqueUsers)}</td>
                          <td style={S.tdNum}>{num(m.couponsUsed)}</td>
                          <td style={S.td}>{m.topCoupon ? <><span style={S.codeChip}>{m.topCoupon.code}</span> <span style={{ fontSize: 12, color: "#6b7280" }}>{m.topCoupon.uses}×</span></> : "—"}</td>
                          <td style={S.tdNum}>{inr(m.discount)}</td>
                          <td style={S.tdNum}>{inr(m.revenue)}</td>
                          <td style={S.tdNum}>{m.cancelled ? num(m.cancelled) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section style={S.panel}>
                <div style={S.panelHead}>
                  <div>
                    <h3 style={S.panelTitle}>Orders that used a coupon</h3>
                    <div style={S.panelSub}>{num(report.orders.length)} orders in this period, cancelled ones included and marked.</div>
                  </div>
                  <div style={{ position: "relative" }}>
                    <FiSearch size={14} style={{ position: "absolute", left: 10, top: 12, color: "#9ca3af" }} />
                    <input id="ord-search" style={{ ...S.input, paddingLeft: 30, width: 260 }} placeholder="Order, coupon or customer" value={orderSearch} onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }} />
                  </div>
                </div>
                {filteredOrders.length === 0 ? (
                  <Empty icon={<FiShoppingCart size={30} />} title="No orders" text="No coupon orders match this search." />
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={{ ...S.th, textAlign: "left" }}>Order</th>
                            <th style={{ ...S.th, textAlign: "left" }}>Coupon</th>
                            <th style={{ ...S.th, textAlign: "left" }}>Customer</th>
                            <th style={{ ...S.th, textAlign: "left" }}>Status</th>
                            <th style={S.th}>Subtotal</th>
                            <th style={S.th}>Discount</th>
                            <th style={S.th}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.slice((orderPage - 1) * PAGE_SIZE, orderPage * PAGE_SIZE).map((o) => (
                            <tr key={o.id} className="cpn-row">
                              <td style={S.td}>
                                <Link href={`/dashboard/admin/orders/${o.id}`} style={S.link}>#{o.orderNumber} <FiExternalLink size={11} /></Link>
                                <div style={{ fontSize: 11.5, color: "#6b7280" }}>{dayTime(o.date)}</div>
                              </td>
                              <td style={S.td}><span style={S.codeChip}>{o.code}</span></td>
                              <td style={S.td}>
                                <div style={{ fontWeight: 600, color: "#111827" }}>{o.customer.name}</div>
                                <div style={{ fontSize: 11.5, color: "#6b7280" }}>{[o.customer.company, o.customer.userType === "partner" ? "Partner" : o.customer.userType ? "Customer" : ""].filter(Boolean).join(" · ")}</div>
                              </td>
                              <td style={S.td}>
                                {o.cancelled ? <Badge bg="#fee2e2" fg="#991b1b">{o.status}</Badge> : <Badge bg="#eef2ff" fg="#3730a3">{o.status}</Badge>}
                              </td>
                              <td style={S.tdNum}>{inr(o.subtotal)}</td>
                              <td style={{ ...S.tdNum, color: "#b45309" }}>−{inr(o.discount)}</td>
                              <td style={{ ...S.tdNum, fontWeight: 700, color: "#111827" }}>{inr(o.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pager page={orderPage} total={filteredOrders.length} onPage={setOrderPage} />
                  </>
                )}
              </section>
            </>
          )}

          {/* ── Abandoned carts tab ── */}
          {tab === "carts" && ab && (
            <>
              <div style={S.kpiGrid}>
                <Kpi icon={<FiShoppingCart size={15} />} tint={["#fee2e2", "#b91c1c"]} label="Abandoned carts" value={num(ab.summary.carts)} sub={`${num(ab.summary.users)} customers · idle over ${ABANDON_OPTIONS.find((o) => o.value === filters.abandonHours)?.label || `${filters.abandonHours} hours`}`} />
                <Kpi icon={<FiTag size={15} />} tint={["#fef3c7", "#b45309"]} label="Value left in carts" value={inr(ab.summary.value)} sub={`Avg ${inr(ab.summary.avgValue)} per cart`} />
                <Kpi icon={<FiPercent size={15} />} tint={["#eef2ff", "#4f46e5"]} label="Abandonment rate (est.)" value={`${ab.summary.ratePct}%`} sub={`${num(ab.summary.carts)} abandoned vs ${num(ab.summary.ordersInRange)} orders placed`} />
                <Kpi icon={<FiCheckCircle size={15} />} tint={["#dcfce7", "#15803d"]} label="Ordered later anyway" value={num(ab.summary.recovered)} sub={`${num(ab.summary.neverOrdered)} have never ordered`} />
                <Kpi icon={<FiClock size={15} />} tint={["#ecfeff", "#0e7490"]} label="Carts still active" value={num(ab.summary.activeCarts)} sub="Updated recently, not counted as abandoned" />
              </div>

              <div style={S.twoColEven}>
                <section style={S.panel}>
                  <div style={S.panelHead}>
                    <div>
                      <h3 style={S.panelTitle}>How long carts have been idle</h3>
                      <div style={S.panelSub}>Recent carts are the easiest to win back.</div>
                    </div>
                  </div>
                  {ab.summary.carts ? (
                    <BarList rows={ab.byAge} valueKey="carts" format={(v) => `${num(v)} carts`} sub={(r) => (r.carts ? inr(r.value) : "")} color="#f59e0b" />
                  ) : (
                    <Empty icon={<FiClock size={26} />} title="Nothing idle" text="No abandoned carts in this period." />
                  )}
                </section>
                <section style={S.panel}>
                  <div style={S.panelHead}>
                    <div>
                      <h3 style={S.panelTitle}>Products left behind</h3>
                      <div style={S.panelSub}>By value sitting in abandoned carts.</div>
                    </div>
                  </div>
                  {ab.byProduct.length ? (
                    <BarList rows={ab.byProduct.slice(0, 8)} labelKey="name" valueKey="value" format={inr} sub={(r) => `${num(r.carts)} cart${r.carts === 1 ? "" : "s"} · ${num(r.quantity)} units`} color="#ef4444" />
                  ) : (
                    <Empty icon={<FiShoppingCart size={26} />} title="No products" text="No abandoned carts in this period." />
                  )}
                </section>
              </div>

              <section style={S.panel}>
                <div style={S.panelHead}>
                  <div>
                    <h3 style={S.panelTitle}>Carts to follow up</h3>
                    <div style={S.panelSub}>Contact these customers by email or WhatsApp. Expand a row to see what is in the cart.</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ position: "relative" }}>
                      <FiSearch size={14} style={{ position: "absolute", left: 10, top: 12, color: "#9ca3af" }} />
                      <input id="cart-search" style={{ ...S.input, paddingLeft: 30, width: 240 }} placeholder="Customer or product" value={cartSearch} onChange={(e) => { setCartSearch(e.target.value); setCartPage(1); }} />
                    </div>
                    <select id="cart-sort" style={{ ...S.input, width: 160 }} value={cartSort} onChange={(e) => setCartSort(e.target.value)} aria-label="Sort carts">
                      <option value="value">Highest value</option>
                      <option value="recent">Most recent</option>
                      <option value="oldest">Oldest first</option>
                    </select>
                  </div>
                </div>

                {filteredCarts.length === 0 ? (
                  <Empty icon={<FiShoppingCart size={30} />} title="No abandoned carts" text={ab.summary.carts ? "No cart matches this search." : "Every cart in this period was checked out or is still active."} />
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={{ ...S.th, width: 34 }} />
                            <th style={{ ...S.th, textAlign: "left" }}>Customer</th>
                            <th style={{ ...S.th, textAlign: "left" }}>In cart</th>
                            <th style={S.th}>Value</th>
                            <th style={{ ...S.th, textAlign: "left" }}>Last activity</th>
                            <th style={{ ...S.th, textAlign: "left" }}>History</th>
                            <th style={{ ...S.th, textAlign: "center" }}>Contact</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCarts.slice((cartPage - 1) * PAGE_SIZE, cartPage * PAGE_SIZE).map((c) => {
                            const open = openCart === c.id;
                            const digits = String(c.customer.phone || "").replace(/\D/g, "");
                            const wa = digits.length === 10 ? `91${digits}` : digits;
                            const waText = encodeURIComponent(`Hi ${c.customer.name}, you left ${c.items.map((i) => i.name).join(", ")} in your cart. Can we help you complete the order?`);
                            return [
                              <tr key={c.id} className="cpn-row">
                                <td style={S.td}>
                                  <button type="button" style={S.expandBtn} onClick={() => setOpenCart(open ? null : c.id)} aria-expanded={open} aria-label="Show cart items">
                                    {open ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
                                  </button>
                                </td>
                                <td style={S.td}>
                                  <div style={{ fontWeight: 600, color: "#111827" }}>{c.customer.name}</div>
                                  <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                                    {[c.customer.company, c.customer.userType === "partner" ? "Partner" : c.customer.userType ? "Customer" : ""].filter(Boolean).join(" · ")}
                                  </div>
                                </td>
                                <td style={S.td}>
                                  <div style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#111827" }}>{c.items[0]?.name}</div>
                                  <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                                    {num(c.quantity)} units{c.itemCount > 1 ? ` · ${c.itemCount} items` : ""}
                                  </div>
                                </td>
                                <td style={{ ...S.tdNum, fontWeight: 700, color: "#111827" }}>{inr(c.value)}</td>
                                <td style={S.td}>
                                  <div style={{ whiteSpace: "nowrap" }}>{ago(c.lastActivity)}</div>
                                  <div style={{ fontSize: 11.5, color: "#6b7280", whiteSpace: "nowrap" }}>{day(c.lastActivity)}</div>
                                </td>
                                <td style={S.td}>
                                  {c.orderedSince ? (
                                    <Badge bg="#dcfce7" fg="#166534" title={`Last order ${day(c.lastOrderAt)}`}>Ordered since</Badge>
                                  ) : c.ordersEver ? (
                                    <Badge bg="#eef2ff" fg="#3730a3" title={`Last order ${day(c.lastOrderAt)}`}>{c.ordersEver} past order{c.ordersEver === 1 ? "" : "s"}</Badge>
                                  ) : (
                                    <Badge bg="#fef3c7" fg="#92400e">Never ordered</Badge>
                                  )}
                                </td>
                                <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                                  {c.customer.email && (
                                    <a href={`mailto:${c.customer.email}`} style={S.actionBtn} title={c.customer.email} aria-label={`Email ${c.customer.name}`}><FiMail size={14} /></a>
                                  )}
                                  {wa && (
                                    <a href={`https://wa.me/${wa}?text=${waText}`} target="_blank" rel="noreferrer" style={{ ...S.actionBtn, color: "#16a34a" }} title={c.customer.phone} aria-label={`WhatsApp ${c.customer.name}`}><FaWhatsapp size={15} /></a>
                                  )}
                                </td>
                              </tr>,
                              open && (
                                <tr key={`${c.id}-items`}>
                                  <td colSpan={7} style={{ padding: "4px 12px 14px 46px", background: "#fafbfc", borderBottom: "1px solid #eef0f3" }}>
                                    <div style={{ display: "grid", gap: 8, paddingTop: 8 }}>
                                      {c.items.map((i, idx) => (
                                        <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                                          {i.image ? (
                                            <img src={i.image} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, border: "1px solid #eef0f3" }} />
                                          ) : (
                                            <span style={{ ...S.kpiIcon, width: 40, height: 40, background: "#f1f2f6", color: "#9ca3af" }}><FiShoppingCart size={16} /></span>
                                          )}
                                          <div style={{ flex: 1, minWidth: 180 }}>
                                            <div style={{ fontWeight: 600, color: "#111827" }}>{i.name}{i.orderName ? <span style={{ color: "#6b7280", fontWeight: 400 }}> · {i.orderName}</span> : null}</div>
                                            <div style={{ fontSize: 11.5, color: "#6b7280" }}>{i.attrs.join(" · ") || "No options selected"}</div>
                                          </div>
                                          <div style={{ fontSize: 12.5, color: "#374151", fontVariantNumeric: "tabular-nums" }}>{num(i.quantity)} × {inr(i.price)} = <strong>{inr(i.value)}</strong></div>
                                        </div>
                                      ))}
                                      <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                                        {c.customer.email}{c.customer.phone ? ` · ${c.customer.phone}` : ""} · last activity {dayTime(c.lastActivity)}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ),
                            ];
                          })}
                        </tbody>
                      </table>
                    </div>
                    <Pager page={cartPage} total={filteredCarts.length} onPage={setCartPage} />
                  </>
                )}
                <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 12 }}>
                  A cart is abandoned when it still has items and has not been touched for the chosen time. The rate is an estimate: abandoned carts ÷ (abandoned carts + orders placed) in the period. Older carts show when their items were added.
                </div>
              </section>
            </>
          )}

          {!report && loading && tab !== "coupons" && <div style={{ ...S.panel, height: 260 }} className="cpn-skeleton" />}
        </div>
      </div>

      {drawer && report && <CouponDrawer coupon={coupons.find((c) => c._id === drawer._id) || drawer} report={report} onClose={() => setDrawer(null)} onEdit={(c) => setEditing(c)} />}
      {editing && <EditModal coupon={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}

      <style>{`
        @keyframes cpn-spin { to { transform: rotate(360deg); } }
        @keyframes cpn-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
        .cpn-skeleton { background: linear-gradient(90deg, #eef0f3, #f6f7fb, #eef0f3) !important; border-radius: 12px; animation: cpn-pulse 1.4s ease-in-out infinite; }
        .cpn-row:hover td { background: #f8f9ff; }
        @media (max-width: 640px) { .cpn-hide-xs { display: none; } }
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
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em" },
  input: { height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 10px", fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box", minWidth: 0, width: "100%", maxWidth: "100%" },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14 },
  kpi: { background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(15,23,42,0.06)", display: "grid", gap: 6, minWidth: 0, alignContent: "start" },
  kpiLabel: { fontSize: 12.5, color: "#6b7280", fontWeight: 600 },
  kpiIcon: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, flexShrink: 0 },
  kpiValue: { fontSize: 24, fontWeight: 800, letterSpacing: "-.01em", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere", color: "#111827" },
  delta: { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20, whiteSpace: "nowrap", justifySelf: "start" },
  deltaSuffix: { fontWeight: 500, opacity: 0.8 },

  tabs: { display: "flex", gap: 4, borderBottom: "1px solid #e5e7eb", overflowX: "auto" },
  tab: { display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 14px", border: "none", borderBottom: "2px solid transparent", background: "transparent", fontSize: 13.5, fontWeight: 600, color: "#6b7280", cursor: "pointer", whiteSpace: "nowrap", marginBottom: -1 },
  tabOn: { color: "#4f46e5", borderBottomColor: "#6366f1" },
  tabCount: { fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: "#f1f2f6", color: "#6b7280" },

  twoColEven: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", gap: 18 },

  toggle: { display: "inline-flex", background: "#f1f2f6", borderRadius: 8, padding: 3 },
  toggleBtn: { border: "none", background: "transparent", padding: "5px 11px", fontSize: 12, fontWeight: 600, color: "#6b7280", borderRadius: 6, cursor: "pointer" },
  toggleOn: { background: "#fff", color: "#111827", boxShadow: "0 1px 2px rgba(0,0,0,.08)" },

  legend: { display: "inline-flex", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3, display: "inline-block" },
  tooltip: { position: "absolute", zIndex: 5, background: "#111827", color: "#fff", fontSize: 12, lineHeight: 1.55, padding: "9px 11px", borderRadius: 8, whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 6px 18px rgba(0,0,0,.18)" },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "right", padding: "10px 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "#6b7280", borderBottom: "1px solid #eef0f3", background: "#f9fafb", whiteSpace: "nowrap", fontWeight: 700 },
  td: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle", color: "#374151" },
  tdNum: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#374151" },
  stickyCol: { position: "sticky", left: 0, zIndex: 1, borderRight: "1px solid #eef0f3" },
  badge: { display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" },
  codeChip: { display: "inline-block", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: 12.5, fontWeight: 700, letterSpacing: ".04em", padding: "3px 8px", borderRadius: 6, border: "1px dashed #a5b4fc", background: "#f5f7ff", color: "#3730a3", whiteSpace: "nowrap" },
  codeBtn: { background: "none", border: "none", padding: 0, cursor: "pointer" },
  link: { color: "#4f46e5", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 },
  empty: { padding: "28px 12px", textAlign: "center", color: "#9ca3af", fontSize: 13 },

  pager: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12, fontSize: 12.5 },
  pageBtn: { height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12.5 },

  ghostBtn: { height: 36, padding: "0 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: "#374151", display: "inline-flex", alignItems: "center", gap: 6 },
  exportBtn: { height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 },
  primaryBtn: { height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", whiteSpace: "nowrap" },
  actionBtn: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, border: "1px solid #eef0f3", background: "#fff", color: "#4b5563", cursor: "pointer", marginLeft: 4, textDecoration: "none" },
  expandBtn: { background: "#f3f4f6", border: "none", borderRadius: 6, width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#4b5563" },
  iconBtn: { background: "#f3f4f6", border: "none", borderRadius: 8, width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },

  switch: { position: "relative", width: 40, height: 22, borderRadius: 22, border: "none", padding: 2, cursor: "pointer", transition: "background .15s", display: "inline-flex", alignItems: "center", flexShrink: 0 },
  switchKnob: { width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.25)", transition: "transform .15s" },

  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 1050, display: "flex", justifyContent: "flex-end" },
  drawer: { width: "min(640px, 100%)", height: "100%", background: "#fff", overflowY: "auto", boxShadow: "-10px 0 30px rgba(0,0,0,.15)" },
  drawerHead: { position: "sticky", top: 0, background: "#fff", zIndex: 2, padding: "18px 20px", borderBottom: "1px solid #eef0f3", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  modal: { width: "min(620px, 100%)", maxHeight: "calc(100vh - 32px)", overflowY: "auto", background: "#fff", borderRadius: 14, boxShadow: "0 20px 50px rgba(0,0,0,.25)" },
  miniGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 },
  mini: { background: "#fafbfc", border: "1px solid #f1f2f6", borderRadius: 10, padding: "9px 11px", minWidth: 0 },
  miniLabel: { fontSize: 10.5, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em" },
  miniValue: { fontSize: 14, fontWeight: 700, color: "#111827", marginTop: 2, overflowWrap: "anywhere" },
};
