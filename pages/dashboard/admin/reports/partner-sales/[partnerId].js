"use client";

// Order history and sales summary of one buyer (partner or customer).
import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import {
  FiArrowLeft, FiDownload, FiSearch, FiShoppingBag, FiTrendingUp, FiPercent, FiPackage, FiXCircle,
  FiChevronDown, FiChevronRight, FiMail, FiPhone, FiMapPin, FiExternalLink, FiAlertTriangle,
} from "react-icons/fi";

const TZ = "Asia/Kolkata";
const CANCELLED = ["Cancelled", "Rejected"];
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0).toLocaleString("en-IN");
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ }) : "—");
const pad = (n) => String(n).padStart(2, "0");
// Calendar date (IST) of a timestamp as YYYY-MM-DD, for comparing with date inputs
const istYmd = (d) => {
  const x = new Date(new Date(d).getTime() + 330 * 60000);
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
};
const PAGE_SIZE = 10;

const statusStyle = (s) => {
  if (CANCELLED.includes(s)) return { background: "#fee2e2", color: "#991b1b" };
  if (s === "Order Delivered" || s === "Delivered") return { background: "#dcfce7", color: "#166534" };
  if (s === "Order Dispatched" || s === "Shipped") return { background: "#dbeafe", color: "#1e40af" };
  if (s === "Pending") return { background: "#fef3c7", color: "#92400e" };
  return { background: "#eef2ff", color: "#3730a3" };
};

export default function BuyerSalesDetail() {
  const router = useRouter();
  const { partnerId } = router.query;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partner, setPartner] = useState(null);
  const [orders, setOrders] = useState([]);

  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);

  // Carry the date range over from the report page
  useEffect(() => {
    if (!router.isReady) return;
    if (typeof router.query.from === "string") setFrom(router.query.from);
    if (typeof router.query.to === "string") setTo(router.query.to);
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!partnerId) return;
    setLoading(true);
    setError("");
    axios
      .get(`/api/admin/reports/partner-sales/${partnerId}`, { withCredentials: true })
      .then((res) => { setPartner(res.data.partner); setOrders(res.data.orders || []); })
      .catch((err) => {
        const msg = err?.response?.data?.message || "Could not load buyer details";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [partnerId]);

  useEffect(() => { setPage(1); }, [status, from, to, search]);

  const inDates = useMemo(() => orders.filter((o) => {
    const dt = istYmd(o.createdAt);
    return (!from || dt >= from) && (!to || dt <= to);
  }), [orders, from, to]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inDates.filter((o) => {
      if (status === "__active" && CANCELLED.includes(o.status)) return false;
      if (status && status !== "__active" && o.status !== status) return false;
      if (!q) return true;
      return [o.orderNumber, o.orderName, o.couponCode, ...o.items.map((i) => i.productName)].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [inDates, status, search]);

  // Summary follows the date range only, so status/search do not hide cancelled counts
  const summary = useMemo(() => {
    const valid = inDates.filter((o) => !CANCELLED.includes(o.status));
    const sales = valid.reduce((s, o) => s + o.total, 0);
    const products = new Map();
    valid.forEach((o) => o.items.forEach((i) => {
      if (!products.has(i.productName)) products.set(i.productName, { name: i.productName, quantity: 0, value: 0, orders: 0 });
      const p = products.get(i.productName);
      p.quantity += i.quantity;
      p.value += i.quantity * i.price;
      p.orders++;
    }));
    return {
      orders: valid.length,
      cancelled: inDates.length - valid.length,
      sales,
      gst: valid.reduce((s, o) => s + o.gstAmount, 0),
      discount: valid.reduce((s, o) => s + o.discount, 0),
      subtotal: valid.reduce((s, o) => s + o.subtotal, 0),
      aov: valid.length ? sales / valid.length : 0,
      units: valid.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0),
      first: valid.length ? valid[valid.length - 1].createdAt : null,
      last: valid.length ? valid[0].createdAt : null,
      products: [...products.values()].sort((a, b) => b.value - a.value),
    };
  }, [inDates]);

  const statuses = useMemo(() => [...new Set(orders.map((o) => o.status))], [orders]);
  const isPartner = partner?.userType === "partner";
  const typeLabel = isPartner ? "Partner" : "Customer";
  const backHref = { pathname: "/dashboard/admin/reports/partner-sales", query: partner?.userType === "customer" ? { type: "customer" } : {} };

  const exportExcel = () => {
    if (!partner) return;
    try {
      const wb = XLSX.utils.book_new();
      const add = (name, rows, widths) => {
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No data" }]);
        if (widths) ws["!cols"] = widths.map((w) => ({ wch: w }));
        XLSX.utils.book_append_sheet(wb, ws, name);
      };
      add("Summary", [
        { Field: typeLabel, Value: partner.name },
        { Field: "Company", Value: partner.companyName || "" },
        { Field: "Member ID", Value: partner.memberId || "" },
        { Field: "Email", Value: partner.email || "" },
        { Field: "Phone", Value: partner.phone || "" },
        { Field: "City / State", Value: [partner.city, partner.state].filter(Boolean).join(", ") },
        { Field: "GSTIN", Value: partner.gstNumber || "" },
        { Field: "Period", Value: from || to ? `${from || "Start"} to ${to || "Today"}` : "All time" },
        { Field: "Orders (excluding cancelled)", Value: summary.orders },
        { Field: "Cancelled / rejected orders", Value: summary.cancelled },
        { Field: "Total sales (₹)", Value: Math.round(summary.sales * 100) / 100 },
        { Field: "Subtotal (₹)", Value: Math.round(summary.subtotal * 100) / 100 },
        { Field: "GST (₹)", Value: Math.round(summary.gst * 100) / 100 },
        { Field: "Coupon discount (₹)", Value: Math.round(summary.discount * 100) / 100 },
        { Field: "Average order value (₹)", Value: Math.round(summary.aov * 100) / 100 },
        { Field: "Units bought", Value: summary.units },
      ], [28, 34]);
      add("Orders", filtered.map((o) => ({
        Date: day(o.createdAt),
        "Order no": o.orderNumber,
        "Order name": o.orderName,
        Products: o.items.map((i) => `${i.productName} x ${i.quantity}`).join(" | "),
        Status: o.status,
        Payment: `${o.paymentMethod || ""} ${o.paymentStatus || ""}`.trim(),
        Coupon: o.couponCode,
        "Subtotal (₹)": o.subtotal,
        "Discount (₹)": o.discount,
        "GST (₹)": o.gstAmount,
        "Total (₹)": o.total,
        "Counted in sales": CANCELLED.includes(o.status) ? "No" : "Yes",
      })), [13, 22, 18, 44, 16, 16, 12, 12, 12, 10, 12, 10]);
      add("Order items", filtered.flatMap((o) => o.items.map((i) => ({
        Date: day(o.createdAt), "Order no": o.orderNumber, Status: o.status, Product: i.productName, Quantity: i.quantity, "Unit price (₹)": i.price, "Value (₹)": Math.round(i.quantity * i.price * 100) / 100,
      }))), [13, 22, 16, 34, 9, 12, 12]);
      add("Products", summary.products.map((p) => ({ Product: p.name, "Units bought": p.quantity, "Value before GST (₹)": Math.round(p.value * 100) / 100, Orders: p.orders })), [34, 12, 18, 8]);

      const safe = String(partner.name || "buyer").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
      XLSX.writeFile(wb, `${safe}-sales.xlsx`);
      toast.success("Excel downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Could not create the Excel file");
    }
  };

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area" style={{ flex: 1, minWidth: 0, background: "#f6f7fb" }}>
        <nav style={S.topbar}>
          <button type="button" onClick={() => setSidebarOpen((v) => !v)} style={S.burger} aria-label="Toggle sidebar">☰</button>
          <Link href={backHref} style={S.back}><FiArrowLeft size={15} /> <span>Sales Report</span></Link>
          <div style={{ marginLeft: "auto" }}>
            <button type="button" onClick={exportExcel} disabled={!partner} style={{ ...S.exportBtn, opacity: partner ? 1 : 0.6 }}>
              <FiDownload size={14} /> Export Excel
            </button>
          </div>
        </nav>

        <div style={S.body}>
          {loading ? (
            <div style={{ ...S.panel, textAlign: "center", color: "#6b7280" }}>Loading…</div>
          ) : error ? (
            <section style={{ ...S.panel, borderColor: "#fecaca", background: "#fff5f5", display: "flex", gap: 10, alignItems: "center" }}>
              <FiAlertTriangle color="#dc2626" /> {error}
            </section>
          ) : (
            <>
              {/* Profile */}
              <section style={{ ...S.panel, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={S.avatar}>{String(partner.name || "?").trim().charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>{partner.name}</h2>
                    <span style={{ ...S.badge, background: isPartner ? "#eef2ff" : "#ecfeff", color: isPartner ? "#4338ca" : "#0e7490" }}>{typeLabel} · {isPartner ? "B2B" : "B2C"}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                    {[partner.companyName, partner.memberId && `Member ID ${partner.memberId}`, partner.gstNumber && `GSTIN ${partner.gstNumber}`, `Joined ${day(partner.createdAt)}`].filter(Boolean).join(" · ")}
                  </div>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 13 }}>
                    {partner.email && <a href={`mailto:${partner.email}`} style={S.contact}><FiMail size={13} /> {partner.email}</a>}
                    {partner.phone && <a href={`tel:${partner.phone}`} style={S.contact}><FiPhone size={13} /> {partner.phone}</a>}
                    {(partner.city || partner.state) && <span style={{ ...S.contact, color: "#6b7280" }}><FiMapPin size={13} /> {[partner.city, partner.state].filter(Boolean).join(", ")}</span>}
                  </div>
                </div>
              </section>

              {/* Filters */}
              <section style={S.panel}>
                <div style={S.filterGrid}>
                  <label style={S.field}>
                    <span style={S.fieldLabel}>From</span>
                    <input id="bd-from" type="date" style={S.input} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                  </label>
                  <label style={S.field}>
                    <span style={S.fieldLabel}>To</span>
                    <input id="bd-to" type="date" style={S.input} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                  </label>
                  <label style={S.field}>
                    <span style={S.fieldLabel}>Status</span>
                    <select id="bd-status" style={S.input} value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="">All orders</option>
                      <option value="__active">Excluding cancelled</option>
                      {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label style={S.field}>
                    <span style={S.fieldLabel}>Search</span>
                    <div style={{ position: "relative" }}>
                      <FiSearch size={14} style={{ position: "absolute", left: 10, top: 12, color: "#9ca3af" }} />
                      <input id="bd-search" style={{ ...S.input, paddingLeft: 30 }} placeholder="Order no, product, coupon" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                  </label>
                </div>
                {(from || to || status || search) && (
                  <button type="button" style={{ ...S.clearBtn, marginTop: 10 }} onClick={() => { setFrom(""); setTo(""); setStatus(""); setSearch(""); }}>Clear filters (show all time)</button>
                )}
              </section>

              {/* KPIs */}
              <div style={S.kpiGrid}>
                <div style={S.kpi}><div style={S.kpiHead}><span style={{ ...S.kpiIcon, background: "#eef2ff", color: "#4f46e5" }}><FiTrendingUp size={15} /></span>Total sales</div><div style={S.kpiValue}>{inr(summary.sales)}</div><div style={S.kpiSub}>GST {inr(summary.gst)}{summary.discount ? ` · discount ${inr(summary.discount)}` : ""}</div></div>
                <div style={S.kpi}><div style={S.kpiHead}><span style={{ ...S.kpiIcon, background: "#ecfeff", color: "#0e7490" }}><FiShoppingBag size={15} /></span>Orders</div><div style={S.kpiValue}>{num(summary.orders)}</div><div style={S.kpiSub}>{summary.last ? `Last order ${day(summary.last)}` : "No orders in this period"}</div></div>
                <div style={S.kpi}><div style={S.kpiHead}><span style={{ ...S.kpiIcon, background: "#fef3c7", color: "#b45309" }}><FiPercent size={15} /></span>Average order</div><div style={S.kpiValue}>{inr(summary.aov)}</div><div style={S.kpiSub}>{summary.first ? `First order ${day(summary.first)}` : "—"}</div></div>
                <div style={S.kpi}><div style={S.kpiHead}><span style={{ ...S.kpiIcon, background: "#dcfce7", color: "#15803d" }}><FiPackage size={15} /></span>Units bought</div><div style={S.kpiValue}>{num(summary.units)}</div><div style={S.kpiSub}>{summary.products.length} different products</div></div>
                <div style={S.kpi}><div style={S.kpiHead}><span style={{ ...S.kpiIcon, background: "#fee2e2", color: "#b91c1c" }}><FiXCircle size={15} /></span>Cancelled</div><div style={S.kpiValue}>{num(summary.cancelled)}</div><div style={S.kpiSub}>Not counted in sales</div></div>
              </div>

              {/* Products */}
              {summary.products.length > 0 && (
                <section style={S.panel}>
                  <h3 style={S.panelTitle}>Products bought</h3>
                  <div style={{ ...S.panelSub, marginBottom: 12 }}>Value before GST and discount, cancelled orders left out.</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={S.table}>
                      <thead><tr><th style={{ ...S.th, textAlign: "left" }}>Product</th><th style={S.th}>Orders</th><th style={S.th}>Units</th><th style={S.th}>Value</th><th style={{ ...S.th, width: "30%" }} /></tr></thead>
                      <tbody>
                        {summary.products.map((p) => (
                          <tr key={p.name}>
                            <td style={{ ...S.td, fontWeight: 600, color: "#111827" }}>{p.name}</td>
                            <td style={S.tdNum}>{num(p.orders)}</td>
                            <td style={S.tdNum}>{num(p.quantity)}</td>
                            <td style={{ ...S.tdNum, fontWeight: 700 }}>{inr(p.value)}</td>
                            <td style={S.td}>
                              <div style={{ height: 7, background: "#f1f2f6", borderRadius: 5, overflow: "hidden" }}>
                                <div style={{ width: `${(p.value / Math.max(1, summary.products[0].value)) * 100}%`, height: "100%", background: "#6366f1" }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Orders */}
              <section style={S.panel}>
                <h3 style={S.panelTitle}>Orders <span style={{ fontWeight: 500, color: "#9ca3af", fontSize: 13 }}>({num(filtered.length)})</span></h3>
                <div style={{ ...S.panelSub, marginBottom: 12 }}>Expand an order to see its items. Cancelled totals are struck through.</div>
                {filtered.length === 0 ? (
                  <div style={S.empty}>No orders match these filters.</div>
                ) : (
                  <>
                    <div style={{ overflowX: "auto" }}>
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={{ ...S.th, width: 34 }} />
                            <th style={{ ...S.th, textAlign: "left" }}>Order</th>
                            <th style={{ ...S.th, textAlign: "left" }}>Products</th>
                            <th style={{ ...S.th, textAlign: "left" }}>Status</th>
                            <th style={{ ...S.th, textAlign: "left" }}>Payment</th>
                            <th style={S.th}>Subtotal</th>
                            <th style={S.th}>GST</th>
                            <th style={S.th}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((o) => {
                            const cancelled = CANCELLED.includes(o.status);
                            const isOpen = open === o._id;
                            return (
                              <Fragment key={o._id}>
                                <tr className="bd-row">
                                  <td style={S.td}>
                                    <button type="button" style={S.expandBtn} onClick={() => setOpen(isOpen ? null : o._id)} aria-expanded={isOpen} aria-label="Show items">
                                      {isOpen ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
                                    </button>
                                  </td>
                                  <td style={S.td}>
                                    <Link href={`/dashboard/admin/orders/${o._id}`} style={S.link}>#{o.orderNumber} <FiExternalLink size={11} /></Link>
                                    <div style={{ fontSize: 11.5, color: "#6b7280" }}>{day(o.createdAt)}{o.orderName ? ` · ${o.orderName}` : ""}</div>
                                  </td>
                                  <td style={S.td}>
                                    <div style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#111827" }}>{o.items[0]?.productName || "—"}</div>
                                    <div style={{ fontSize: 11.5, color: "#6b7280" }}>{o.items.length > 1 ? `+${o.items.length - 1} more · ` : ""}{num(o.items.reduce((a, i) => a + i.quantity, 0))} units</div>
                                  </td>
                                  <td style={S.td}><span style={{ ...S.badge, ...statusStyle(o.status) }}>{o.status}</span></td>
                                  <td style={{ ...S.td, fontSize: 12 }}>
                                    <div>{o.paymentMethod || "—"}</div>
                                    <div style={{ color: o.paymentStatus === "PAID" ? "#15803d" : o.paymentStatus === "REFUNDED" ? "#b45309" : "#6b7280" }}>{o.paymentStatus}</div>
                                  </td>
                                  <td style={S.tdNum}>
                                    {inr(o.subtotal)}
                                    {o.discount > 0 && <div style={{ fontSize: 11.5, color: "#b45309" }}>−{inr(o.discount)} {o.couponCode}</div>}
                                  </td>
                                  <td style={S.tdNum}>{inr(o.gstAmount)}</td>
                                  <td style={{ ...S.tdNum, fontWeight: 700, color: cancelled ? "#9ca3af" : "#111827", textDecoration: cancelled ? "line-through" : "none" }}>{inr(o.total)}</td>
                                </tr>
                                {isOpen && (
                                  <tr>
                                    <td colSpan={8} style={{ padding: "6px 12px 14px 46px", background: "#fafbfc", borderBottom: "1px solid #eef0f3" }}>
                                      {o.items.map((i, idx) => (
                                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", fontSize: 12.5, borderBottom: idx < o.items.length - 1 ? "1px dashed #eef0f3" : "none" }}>
                                          <span style={{ color: "#111827" }}>{i.productName}</span>
                                          <span style={{ fontVariantNumeric: "tabular-nums", color: "#374151", whiteSpace: "nowrap" }}>{num(i.quantity)} × {inr(i.price)} = <strong>{inr(i.quantity * i.price)}</strong></span>
                                        </div>
                                      ))}
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
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
            </>
          )}
        </div>
      </div>

      <style>{`.bd-row:hover td { background: #f8f9ff; }`}</style>
    </div>
  );
}

const S = {
  topbar: { background: "#fff", borderBottom: "1px solid #eee", padding: "0 20px", minHeight: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100, gap: 4 },
  burger: { background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 12, flexShrink: 0 },
  back: { display: "inline-flex", alignItems: "center", gap: 6, color: "#374151", fontWeight: 600, textDecoration: "none", fontSize: 14 },
  body: { padding: "20px clamp(12px, 2.5vw, 24px)", display: "grid", gap: 18 },
  panel: { background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(15,23,42,0.06)", border: "1px solid #eef0f3", minWidth: 0 },
  panelTitle: { margin: 0, fontSize: 15.5, fontWeight: 700, color: "#111827" },
  panelSub: { fontSize: 12.5, color: "#6b7280", marginTop: 3 },
  avatar: { width: 54, height: 54, borderRadius: 14, background: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, flexShrink: 0 },
  contact: { display: "inline-flex", alignItems: "center", gap: 5, color: "#4f46e5", textDecoration: "none" },
  filterGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".05em" },
  input: { height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 10px", fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box", minWidth: 0, width: "100%" },
  clearBtn: { background: "none", border: "none", color: "#4f46e5", fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 },
  kpi: { background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(15,23,42,0.06)", display: "grid", gap: 6, minWidth: 0, alignContent: "start" },
  kpiHead: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#6b7280", fontWeight: 600 },
  kpiIcon: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, flexShrink: 0 },
  kpiValue: { fontSize: 22, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#111827", overflowWrap: "anywhere" },
  kpiSub: { fontSize: 12, color: "#6b7280" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "right", padding: "10px 12px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "#6b7280", borderBottom: "1px solid #eef0f3", background: "#f9fafb", whiteSpace: "nowrap", fontWeight: 700 },
  td: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle", color: "#374151" },
  tdNum: { padding: "10px 12px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle", textAlign: "right", fontVariantNumeric: "tabular-nums", color: "#374151" },
  badge: { display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" },
  link: { color: "#4f46e5", fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 },
  expandBtn: { background: "#f3f4f6", border: "none", borderRadius: 6, width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#4b5563" },
  empty: { padding: "28px 12px", textAlign: "center", color: "#9ca3af", fontSize: 13 },
  pager: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12, fontSize: 12.5 },
  pageBtn: { height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontSize: 12.5 },
  exportBtn: { height: 36, padding: "0 14px", borderRadius: 8, border: "none", background: "#22c55e", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 },
};
