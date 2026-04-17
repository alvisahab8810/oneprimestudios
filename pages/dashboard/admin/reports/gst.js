"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FiBell, FiDownload, FiChevronDown, FiChevronRight, FiBarChart2 } from "react-icons/fi";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const fmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StatCard({ label, value, sub, color = "#111" }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #f0f0f0", borderRadius: 12, padding: "18px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color, letterSpacing: "-0.5px" }}>{value}</p>
      {sub && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#9ca3af" }}>{sub}</p>}
    </div>
  );
}

export default function GstReport() {
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [year, setYear]                 = useState(String(currentYear));
  const [month, setMonth]               = useState(String(currentMonth));
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [expanded, setExpanded]         = useState({});

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { year };
      if (month !== "all") params.month = month;
      const res = await axios.get("/api/admin/reports/gst", { params, withCredentials: true });
      setData(res.data);
    } catch {
      toast.error("Failed to load GST report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  const toggleParty = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // Export to CSV
  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Party Name", "GSTIN", "Invoice No", "Invoice Date", "GST Type", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax", "Grand Total"],
    ];
    data.parties.forEach((party) => {
      party.invoices.forEach((inv) => {
        rows.push([
          party.partnerName,
          party.gstin || "",
          inv.invoiceNumber,
          new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
          inv.gstType || "",
          inv.taxable.toFixed(2),
          inv.cgst.toFixed(2),
          inv.sgst.toFixed(2),
          inv.igst.toFixed(2),
          inv.tax.toFixed(2),
          inv.grand.toFixed(2),
        ]);
      });
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `GST_Report_${month === "all" ? year : `${MONTHS[Number(month) - 1]}_${year}`}.csv`;
    a.click();
  };

  const yearOptions = [];
  for (let y = currentYear; y >= currentYear - 4; y--) yearOptions.push(y);

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>

        {/* Topbar */}
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((s) => !s)}
            style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 16 }}>☰</button>
          <FiBarChart2 size={18} style={{ marginRight: 8, color: "#6b7280" }} />
          <span style={{ fontWeight: 700, fontSize: 17 }}>GST Report — Per Party / Monthly</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/dashboard/admin/reports"
              style={{ fontSize: 13, color: "#6b7280", textDecoration: "none", fontWeight: 500 }}>
              ← Reports
            </Link>
          </div>
        </nav>

        <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>

          {/* Filters */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #f0f0f0", padding: "16px 20px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Year</label>
              <select value={year} onChange={(e) => setYear(e.target.value)}
                style={{ border: "1.5px solid #e5e5e5", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, background: "#fff", cursor: "pointer" }}>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Month</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)}
                style={{ border: "1.5px solid #e5e5e5", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, background: "#fff", cursor: "pointer" }}>
                <option value="all">All Months</option>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <button onClick={fetchReport} disabled={loading}
              style={{ padding: "8px 20px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {loading ? "Loading…" : "Apply"}
            </button>
            {data && (
              <button onClick={exportCsv}
                style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, border: "1.5px solid #e5e5e5", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
                <FiDownload size={14} /> Export CSV
              </button>
            )}
          </div>

          {loading && <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Loading report…</div>}

          {!loading && data && (
            <>
              {/* Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
                <StatCard label="Total Invoices" value={data.summary.totalInvoices} />
                <StatCard label="Taxable Value"  value={fmt(data.summary.taxable)} />
                <StatCard label="CGST"           value={fmt(data.summary.cgst)} color="#2563eb" />
                <StatCard label="SGST"           value={fmt(data.summary.sgst)} color="#7c3aed" />
                <StatCard label="IGST"           value={fmt(data.summary.igst)} color="#0891b2" />
                <StatCard label="Total Tax"      value={fmt(data.summary.tax)}  color="#dc2626" />
                <StatCard label="Grand Total"    value={fmt(data.summary.grand)} color="#111" />
              </div>

              {data.parties.length === 0 && (
                <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #f0f0f0", padding: 60, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                  No invoices found for the selected period.
                </div>
              )}

              {/* Per-Party Breakdown */}
              {data.parties.map((party, pi) => {
                const key = String(party.partnerId || pi);
                const open = expanded[key];
                return (
                  <div key={key} style={{ background: "#fff", border: "1.5px solid #f0f0f0", borderRadius: 12, marginBottom: 14, overflow: "hidden" }}>
                    {/* Party header row */}
                    <div
                      onClick={() => toggleParty(key)}
                      style={{ display: "flex", alignItems: "center", padding: "14px 20px", cursor: "pointer", gap: 12, borderBottom: open ? "1px solid #f0f0f0" : "none" }}>
                      <span style={{ color: "#9ca3af", flexShrink: 0 }}>
                        {open ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#111" }}>{party.partnerName}</p>
                        {party.gstin && (
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>GSTIN: {party.gstin}</p>
                        )}
                      </div>
                      <span style={{ background: party.partnerType === "B2B" ? "#ede9fe" : "#f3f4f6", color: party.partnerType === "B2B" ? "#5b21b6" : "#374151", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, marginRight: 8 }}>
                        {party.partnerType}
                      </span>
                      <div style={{ display: "flex", gap: 24, fontSize: 12, color: "#374151", flexShrink: 0 }}>
                        <span><span style={{ color: "#9ca3af" }}>Invoices: </span><strong>{party.invoices.length}</strong></span>
                        <span><span style={{ color: "#9ca3af" }}>Tax: </span><strong>{fmt(party.totals.tax)}</strong></span>
                        <span><span style={{ color: "#9ca3af" }}>Total: </span><strong style={{ fontSize: 14 }}>{fmt(party.totals.grand)}</strong></span>
                      </div>
                    </div>

                    {/* Invoice detail table */}
                    {open && (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ background: "#f9fafb" }}>
                              {["Invoice No", "Date", "GST Type", "Taxable Value", "CGST", "SGST", "IGST", "Total Tax", "Grand Total"].map((h) => (
                                <th key={h} style={{ padding: "9px 14px", textAlign: h === "Invoice No" || h === "Date" || h === "GST Type" ? "left" : "right", fontWeight: 700, fontSize: 11, color: "#6b7280", borderBottom: "1.5px solid #f0f0f0", whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {party.invoices.map((inv, ii) => (
                              <tr key={ii} style={{ borderBottom: "1px solid #f5f5f5" }}>
                                <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 12, color: "#374151", fontWeight: 600 }}>{inv.invoiceNumber}</td>
                                <td style={{ padding: "9px 14px", color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(inv.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                <td style={{ padding: "9px 14px" }}>
                                  <span style={{ background: inv.gstType === "INTRA" ? "#ecfdf5" : inv.gstType === "INTER" ? "#eff6ff" : "#f3f4f6", color: inv.gstType === "INTRA" ? "#065f46" : inv.gstType === "INTER" ? "#1d4ed8" : "#374151", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                                    {inv.gstType || "—"}
                                  </span>
                                </td>
                                <td style={{ padding: "9px 14px", textAlign: "right" }}>{fmt(inv.taxable)}</td>
                                <td style={{ padding: "9px 14px", textAlign: "right", color: inv.cgst > 0 ? "#2563eb" : "#9ca3af" }}>{fmt(inv.cgst)}</td>
                                <td style={{ padding: "9px 14px", textAlign: "right", color: inv.sgst > 0 ? "#7c3aed" : "#9ca3af" }}>{fmt(inv.sgst)}</td>
                                <td style={{ padding: "9px 14px", textAlign: "right", color: inv.igst > 0 ? "#0891b2" : "#9ca3af" }}>{fmt(inv.igst)}</td>
                                <td style={{ padding: "9px 14px", textAlign: "right", color: "#dc2626", fontWeight: 600 }}>{fmt(inv.tax)}</td>
                                <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700 }}>{fmt(inv.grand)}</td>
                              </tr>
                            ))}
                            {/* Party totals row */}
                            <tr style={{ background: "#f9fafb", borderTop: "2px solid #e5e5e5" }}>
                              <td colSpan={3} style={{ padding: "9px 14px", fontWeight: 800, fontSize: 12, color: "#111" }}>Subtotal ({party.invoices.length} invoices)</td>
                              <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700 }}>{fmt(party.totals.taxable)}</td>
                              <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, color: "#2563eb" }}>{fmt(party.totals.cgst)}</td>
                              <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, color: "#7c3aed" }}>{fmt(party.totals.sgst)}</td>
                              <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, color: "#0891b2" }}>{fmt(party.totals.igst)}</td>
                              <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 700, color: "#dc2626" }}>{fmt(party.totals.tax)}</td>
                              <td style={{ padding: "9px 14px", textAlign: "right", fontWeight: 800, fontSize: 13 }}>{fmt(party.totals.grand)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Overall totals footer */}
              {data.parties.length > 1 && (
                <div style={{ background: "#111", color: "#fff", borderRadius: 12, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>Grand Total ({data.summary.totalInvoices} invoices)</span>
                  <div style={{ display: "flex", gap: 28, fontSize: 13, fontWeight: 600 }}>
                    <span>Taxable: <strong>{fmt(data.summary.taxable)}</strong></span>
                    <span style={{ color: "#93c5fd" }}>CGST: <strong>{fmt(data.summary.cgst)}</strong></span>
                    <span style={{ color: "#c4b5fd" }}>SGST: <strong>{fmt(data.summary.sgst)}</strong></span>
                    <span style={{ color: "#67e8f9" }}>IGST: <strong>{fmt(data.summary.igst)}</strong></span>
                    <span style={{ color: "#fca5a5" }}>Tax: <strong>{fmt(data.summary.tax)}</strong></span>
                    <span style={{ fontSize: 16, fontWeight: 900 }}>{fmt(data.summary.grand)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
