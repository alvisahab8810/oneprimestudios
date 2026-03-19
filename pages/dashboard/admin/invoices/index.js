// pages/dashboard/admin/invoices/index.js
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaBell } from "react-icons/fa";
import {
  FiFileText, FiSearch, FiDownload, FiEye,
  FiSend, FiFilter, FiX, FiPlus,
} from "react-icons/fi";

const STATUS_CFG = {
  DRAFT:     { bg: "#fef9c3", color: "#854d0e" },
  SENT:      { bg: "#dcfce7", color: "#15803d" },
  UPDATED:   { bg: "#dbeafe", color: "#1d4ed8" },
  CANCELLED: { bg: "#fee2e2", color: "#b91c1c" },
};

const TYPE_CFG = {
  B2B:          { bg: "#ede9fe", color: "#5b21b6" },
  B2C:          { bg: "#dcfce7", color: "#15803d" },
  UNREGISTERED: { bg: "#f3f4f6", color: "#374151" },
};

export default function AdminInvoiceList() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [invoices, setInvoices]       = useState([]);
  const [stats, setStats]             = useState(null);
  const [partySummary, setPartySummary] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("invoices"); // invoices | parties | stats

  // Filters
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter]   = useState("");
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [total, setTotal]             = useState(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchStats = async () => {
    try {
      const res = await axios.get("/api/admin/invoices?summary=true", { withCredentials: true });
      setStats(res.data.stats);
      setPartySummary(res.data.partySummary || []);
    } catch {}
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append("status",      statusFilter);
      if (typeFilter)   params.append("partnerType",  typeFilter);
      if (search)       params.append("search",       search);

      const res = await axios.get(`/api/admin/invoices?${params}`, { withCredentials: true });
      setInvoices(res.data.invoices || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch { toast.error("Failed to load invoices"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchInvoices(); }, [statusFilter, typeFilter, page, search]);

 const sendInvoice = async (invoiceId) => {
  if (!confirm("Send this invoice? It will be locked and emailed to the partner.")) return;
  const toastId = toast.loading("Sending invoice...");
  try {
    // Step 1: Lock invoice
    await axios.post("/api/admin/invoices/send", { invoiceId }, { withCredentials: true });

    // Step 2: Generate PDF
    try {
      await axios.post("/api/admin/invoices/generate-pdf", { invoiceId }, { withCredentials: true });
    } catch (pdfErr) {
      console.warn("PDF generation failed:", pdfErr.response?.data?.message);
    }

    // Step 3: Send email
    try {
      await axios.post("/api/admin/invoices/send-email", { invoiceId }, { withCredentials: true });
      toast.success("Invoice sent & emailed successfully", { id: toastId });
    } catch (emailErr) {
      toast.success("Invoice sent (email delivery failed — check logs)", { id: toastId });
      console.warn("Email failed:", emailErr.response?.data?.message);
    }

    fetchInvoices();
    fetchStats();
  } catch (err) {
    toast.error(err.response?.data?.message || "Failed to send invoice", { id: toastId });
  }
};

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>

        {/* Topbar */}
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(s => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 16 }}>☰</button>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Invoices</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            <FaBell size={18} color="#9ca3af" />
            <Link href="/dashboard/admin/invoices/create"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#111", color: "#fff", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              <FiPlus size={13} /> Create Invoice
            </Link>
          </div>
        </nav>

        <div style={{ padding: 24 }}>

          {/* ── Stats cards ── */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Total Invoices",   value: stats.totalInvoices,              color: "#6366f1", fmt: false },
                { label: "Total Billing",    value: fmt(stats.totalBilling),          color: "#111",    fmt: true },
                { label: "Taxable Value",    value: fmt(stats.totalTaxable),          color: "#0ea5e9", fmt: true },
                { label: "Total Tax",        value: fmt(stats.totalTax),              color: "#f59e0b", fmt: true },
                { label: "CGST Collected",   value: fmt(stats.totalCgst),             color: "#8b5cf6", fmt: true },
                { label: "SGST Collected",   value: fmt(stats.totalSgst),             color: "#8b5cf6", fmt: true },
                { label: "IGST Collected",   value: fmt(stats.totalIgst),             color: "#ec4899", fmt: true },
                { label: "B2B Invoices",     value: stats.b2bCount,                   color: "#5b21b6", fmt: false },
                { label: "Without GST",      value: stats.noGstCount,                 color: "#6b7280", fmt: false },
                { label: "Draft",            value: stats.draftCount,                 color: "#854d0e", fmt: false },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", borderLeft: `3px solid ${s.color}` }}>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color, letterSpacing: "-0.5px" }}>{s.fmt ? s.value : s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Tabs ── */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {[["invoices","Invoices"],["parties","Per Party"],["stats","GST Summary"]].map(([key,label]) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{ padding: "8px 18px", borderRadius: 8, border: `1.5px solid ${activeTab === key ? "#111" : "#e5e5e5"}`, background: activeTab === key ? "#111" : "#fff", color: activeTab === key ? "#fff" : "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── INVOICES TAB ── */}
          {activeTab === "invoices" && (
            <>
              {/* Toolbar */}
              <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ position: "relative", flex: "1 1 200px" }}>
                  <FiSearch size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                  <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search invoice no, order no, partner, GST..."
                    style={{ width: "100%", paddingLeft: 32, height: 38, border: "1.5px solid #e5e5e5", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                  style={{ height: 38, border: "1.5px solid #e5e5e5", borderRadius: 8, padding: "0 12px", fontSize: 13, background: "#fff", minWidth: 130 }}>
                  <option value="">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="UPDATED">Updated</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                  style={{ height: 38, border: "1.5px solid #e5e5e5", borderRadius: 8, padding: "0 12px", fontSize: 13, background: "#fff", minWidth: 130 }}>
                  <option value="">All Types</option>
                  <option value="B2B">B2B (with GST)</option>
                  <option value="B2C">B2C</option>
                  <option value="UNREGISTERED">Unregistered</option>
                </select>
              </div>

              {/* Table */}
              <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0f0f0", fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>
                  {total} invoice{total !== 1 ? "s" : ""}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                        {["Invoice No","Invoice Date","Order No","Party Name","GST No","Type","Taxable Value","Tax Amt","Grand Total","Status","Actions"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading...</td></tr>
                      ) : invoices.length === 0 ? (
                        <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No invoices found</td></tr>
                      ) : invoices.map((inv, idx) => {
                        const sc = STATUS_CFG[inv.status] || {};
                        const tc = TYPE_CFG[inv.partnerType] || TYPE_CFG.B2C;
                        return (
                          <tr key={inv._id} style={{ borderBottom: "1px solid #f5f5f5", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <td style={{ padding: "11px 14px", fontWeight: 700, color: "#6366f1" }}>{inv.invoiceNumber}</td>
                            <td style={{ padding: "11px 14px", color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(inv.createdAt).toLocaleDateString("en-IN")}</td>
                            <td style={{ padding: "11px 14px" }}>#{inv.orderNumber}</td>
                            <td style={{ padding: "11px 14px", fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.partnerName}</td>
                            <td style={{ padding: "11px 14px", color: "#6b7280", fontFamily: "monospace", fontSize: 12 }}>{inv.partnerAddress?.gst || "—"}</td>
                            <td style={{ padding: "11px 14px" }}>
                              <span style={{ ...tc, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{inv.partnerType || "B2B"}</span>
                            </td>
                            <td style={{ padding: "11px 14px", fontWeight: 600 }}>{fmt(inv.taxableValue || inv.subTotal)}</td>
                            <td style={{ padding: "11px 14px" }}>{fmt(inv.gstAmount)}</td>
                            <td style={{ padding: "11px 14px", fontWeight: 800 }}>{fmt(inv.grandTotal)}</td>
                            <td style={{ padding: "11px 14px" }}>
                              <span style={{ ...sc, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700 }}>{inv.status}</span>
                            </td>
                            <td style={{ padding: "11px 14px" }}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <Link href={`/dashboard/admin/invoices/${inv._id}`}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #6366f1", color: "#6366f1", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                                  <FiEye size={11} /> View
                                </Link>
                                <Link href={`/dashboard/admin/invoices/${inv._id}/edit`}
                                  style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #e5e5e5", color: "#374151", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                                  Edit
                                </Link>
                                {inv.status === "DRAFT" || inv.status === "UPDATED" ? (
                                  <button onClick={() => sendInvoice(inv._id)}
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "none", background: "#dcfce7", color: "#15803d", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                    <FiSend size={10} /> Send
                                  </button>
                                ) : null}
                                {inv.pdfUrl && (
                                  <a href={inv.pdfUrl} target="_blank" rel="noreferrer"
                                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #e5e5e5", color: "#374151", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                                    <FiDownload size={11} />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ padding: "14px 20px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                      style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 13 }}>← Previous</button>
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>Page {page} of {totalPages}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                      style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 13 }}>Next →</button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── PER PARTY TAB ── */}
          {activeTab === "parties" && (
            <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                      {["Party Name","Type","GST No","No. of Invoices","Total Taxable","Total Tax","Total Billing"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {partySummary.map((p, idx) => {
                      const tc = TYPE_CFG[p.partnerType] || TYPE_CFG.B2C;
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid #f5f5f5", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "12px 14px", fontWeight: 600 }}>{p.partnerName}</td>
                          <td style={{ padding: "12px 14px" }}><span style={{ ...tc, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{p.partnerType}</span></td>
                          <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{p.gst || "—"}</td>
                          <td style={{ padding: "12px 14px", fontWeight: 700, color: "#6366f1" }}>{p.count}</td>
                          <td style={{ padding: "12px 14px" }}>{fmt(p.totalTaxable)}</td>
                          <td style={{ padding: "12px 14px" }}>{fmt(p.totalTax)}</td>
                          <td style={{ padding: "12px 14px", fontWeight: 800 }}>{fmt(p.totalBilling)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── GST SUMMARY TAB ── */}
          {activeTab === "stats" && stats && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* B2B vs B2C breakdown */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Invoice Breakdown</p>
                {[
                  { label: "B2B Invoices (with GST)",    value: stats.b2bCount,    color: "#5b21b6" },
                  { label: "B2C Invoices",                value: stats.b2cCount,    color: "#15803d" },
                  { label: "Without GST / Unregistered", value: stats.noGstCount,  color: "#6b7280" },
                  { label: "Total",                       value: stats.totalInvoices, color: "#111" },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ fontSize: 14, color: "#374151" }}>{r.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>

              {/* Tax breakdown */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p style={{ margin: "0 0 16px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>Tax Collected</p>
                {[
                  { label: "Total Taxable Value", value: fmt(stats.totalTaxable), color: "#0ea5e9" },
                  { label: "CGST Collected",      value: fmt(stats.totalCgst),    color: "#8b5cf6" },
                  { label: "SGST Collected",      value: fmt(stats.totalSgst),    color: "#8b5cf6" },
                  { label: "IGST Collected",      value: fmt(stats.totalIgst),    color: "#ec4899" },
                  { label: "Total Tax",           value: fmt(stats.totalTax),     color: "#f59e0b" },
                  { label: "Total Billing",       value: fmt(stats.totalBilling), color: "#111"    },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ fontSize: 14, color: "#374151" }}>{r.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: r.color }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// "use client";

// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import Sidebar from "@/components/admin-panel/Sidebar";
// import toast from "react-hot-toast";
// import Link from "next/link";

// export default function AdminInvoiceList() {
//   const [sidebarOpen] = useState(true);
//   const [invoices, setInvoices] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const fetchInvoices = async () => {
//     try {
//       setLoading(true);
//       const res = await axios.get("/api/admin/invoices");
//       setInvoices(res.data || []);
//     } catch (err) {
//       toast.error("Failed to load invoices");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const sendInvoice = async (invoiceId) => {
//     if (!confirm("Send this invoice? After sending, it cannot be edited.")) return;

//     try {
//       await axios.post("/api/admin/invoices/send", { invoiceId });
//       toast.success("Invoice sent");
//       fetchInvoices();
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to send invoice");
//     }
//   };

//   useEffect(() => {
//     fetchInvoices();
//   }, []);

//   return (
//     <div className="d-flex">
//       <Sidebar sidebarOpen={sidebarOpen} />

//       <div className="main-area">
//         <div className="container-fluid p-4">

//           {/* Header */}
//           <div className="d-flex justify-content-between align-items-center mb-3">
//             <h1 className="dashboard-main-h">Invoices</h1>
//             <Link href="/dashboard/admin/invoices/create" className="btn btn-primary">
//               + Create Invoice
//             </Link>
//           </div>

//           {/* Table */}
//           <div className="card p-3">
//             {loading ? (
//               <div>Loading...</div>
//             ) : (
//               <div className="table-responsive">
//                 <table className="table table-bordered align-middle">
//                   <thead>
//                     <tr>
//                       <th>Invoice No</th>
//                       <th>Order No</th>
//                       <th>Partner</th>
//                       <th>Amount</th>
//                       <th>Status</th>
//                       <th>Created</th>
//                       <th>Actions</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {invoices.length === 0 && (
//                       <tr>
//                         <td colSpan="7" className="text-center text-muted">
//                           No invoices found
//                         </td>
//                       </tr>
//                     )}

//                     {invoices.map((inv) => (
//                       <tr key={inv._id}>
//                         <td>{inv.invoiceNumber}</td>
//                         <td>#{inv.orderNumber}</td>
//                         <td>{inv.partnerName || "—"}</td>
//                         <td>₹ {inv.grandTotal}</td>
//                         <td>
//                           <span
//                             className={`badge ${
//                               inv.status === "SENT"
//                                 ? "bg-success"
//                                 : "bg-warning text-dark"
//                             }`}
//                           >
//                             {inv.status}
//                           </span>
//                         </td>
//                         <td>{new Date(inv.createdAt).toLocaleString()}</td>
//                         <td>
//                           <Link
//                             href={`/dashboard/admin/invoices/${inv._id}`}
//                             className="btn btn-sm btn-outline-primary me-2"
//                           >
//                             View
//                           </Link>

//                           {inv.status === "DRAFT" && (
//                             <button
//                               className="btn btn-sm btn-success"
//                               onClick={() => sendInvoice(inv._id)}
//                             >
//                               Send
//                             </button>
//                           )}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }
