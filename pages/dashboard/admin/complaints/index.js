// pages/dashboard/admin/complaints/index.js  — Admin complaints list
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaBell, FaSearch, FaTimes, FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx";

const STATUS_STYLES = {
  Pending:       { bg: "#fef9c3", color: "#854d0e" },
  "Under Review":{ bg: "#dbeafe", color: "#1d4ed8" },
  Initiated:     { bg: "#ede9fe", color: "#6d28d9" },
  Resolved:      { bg: "#dcfce7", color: "#15803d" },
};

// Partner (B2B) and retail (B2C) complaints share one list, so each row says which
const typeBadge = { borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 700, letterSpacing: 0.3 };
const b2bBadge = { ...typeBadge, background: "#eef2ff", color: "#4338ca", border: "1px solid #ddd9fb" };
const b2cBadge = { ...typeBadge, background: "#ecfdf5", color: "#047857", border: "1px solid #c6f0df" };

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [sideFilter, setSideFilter] = useState("");
  const [exporting, setExporting]   = useState(false);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]       = useState(0);
  // Status counts for the cards, worked out by the server over every match
  const [counts, setCounts]     = useState({});

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearchQuery(searchInput.trim()); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Every filter on screen, in the shape the API reads them
  const filterParams = (extra = {}) => {
    const params = new URLSearchParams({ page, limit: 15, ...extra });
    if (statusFilter) params.append("status", statusFilter);
    if (searchQuery)  params.append("search", searchQuery);
    if (sideFilter)   params.append("userType", sideFilter);
    if (fromDate)     params.append("from", fromDate);
    if (toDate)       params.append("to", toDate);
    return params;
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = filterParams();
      const res = await axios.get(`/api/admin/complaints?${params}`, { withCredentials: true });
      setComplaints(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
      setCounts(res.data.counts || {});
    } catch { toast.error("Failed to load complaints"); }
    finally  { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter, page, searchQuery, sideFilter, fromDate, toDate]);

  const hasFilters = searchQuery || statusFilter || sideFilter || fromDate || toDate;
  const clearFilters = () => {
    setSearchInput(""); setSearchQuery(""); setStatusFilter("");
    setSideFilter(""); setFromDate(""); setToDate(""); setPage(1);
  };

  // The table shows one page at a time; the export takes every complaint the
  // filters match, so what is downloaded is the whole filtered list.
  const exportExcel = async () => {
    try {
      setExporting(true);

      const params = filterParams({ page: 1, limit: 5000 });
      const res = await axios.get(`/api/admin/complaints?${params}`, { withCredentials: true });
      const rows = res.data.data || [];

      if (!rows.length) {
        toast.error("There is nothing to export");
        return;
      }

      const dateTime = (d) =>
        d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";

      const sheet = rows.map((c) => ({
        "Complaint No": c.complaintNumber || "",
        "Raised On": dateTime(c.createdAt),
        Status: c.status || "",
        Side: c.user?.userType === "partner" ? "B2B" : "B2C",
        Customer: c.user?.name || "",
        Company: c.user?.companyName || "",
        Email: c.user?.email || "",
        Phone: c.user?.phone || "",
        "Order ID": c.orderId || "",
        Complaint: c.message || "",
        "Admin Reply": c.adminReply || "",
        Photos: (c.images || []).length,
        Video: c.video ? "Yes" : "No",
        "Last Updated": dateTime(c.updatedAt),
      }));

      const summary = [
        { Field: "Exported on", Value: dateTime(new Date()) },
        { Field: "Status filter", Value: statusFilter || "All" },
        { Field: "Side filter", Value: sideFilter === "partner" ? "B2B" : sideFilter === "customer" ? "B2C" : "All" },
        { Field: "From date", Value: fromDate || "Any" },
        { Field: "To date", Value: toDate || "Any" },
        { Field: "Search", Value: searchQuery || "None" },
        { Field: "Complaints", Value: sheet.length },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), "Complaints");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Filters");

      const range = fromDate || toDate ? `_${fromDate || "start"}-to-${toDate || "today"}` : "";
      XLSX.writeFile(
        wb,
        `complaints_${statusFilter ? statusFilter.replace(/\s+/g, "-").toLowerCase() : "all"}${range}_${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      toast.success(`Exported ${sheet.length} complaint${sheet.length !== 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not build the Excel file");
    } finally {
      setExporting(false);
    }
  };

  const allCount = Object.values(counts).reduce((sum, n) => sum + Number(n || 0), 0);

  const stats = [
    { label: "Total",        value: allCount,                 color: "#6366f1" },
    { label: "Pending",      value: counts["Pending"] || 0,      color: "#f59e0b" },
    { label: "Under Review", value: counts["Under Review"] || 0, color: "#3b82f6" },
    { label: "Resolved",     value: counts["Resolved"] || 0,     color: "#22c55e" },
  ];

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>

        {/* Topbar */}
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(s => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 16 }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Complaints</span>
          <div style={{ marginLeft: "auto" }}><FaBell size={18} color="#888" /></div>
        </nav>

        <div style={{ padding: 24 }}>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${s.color}` }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 200px" }}>
              <FaSearch style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 12 }} />
              <input
                value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by name, order ID, complaint No..."
                style={{ width: "100%", paddingLeft: 32, height: 38, border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <select value={statusFilter} onChange={e => { setPage(1); setStatusFilter(e.target.value); }}
              style={{ height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 13, background: "#fff", minWidth: 150 }}>
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Initiated">Initiated</option>
              <option value="Resolved">Resolved</option>
            </select>

            {/* B2B and B2C complaints share this list, so either side can be picked */}
            <select value={sideFilter} onChange={e => { setPage(1); setSideFilter(e.target.value); }}
              style={{ height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 13, background: "#fff", minWidth: 130 }}>
              <option value="">All Users</option>
              <option value="partner">B2B (Partner)</option>
              <option value="customer">B2C (Customer)</option>
            </select>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>From</label>
              <input type="date" value={fromDate} max={toDate || undefined}
                onChange={e => { setPage(1); setFromDate(e.target.value); }}
                style={{ height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 10px", fontSize: 13 }} />
              <label style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>To</label>
              <input type="date" value={toDate} min={fromDate || undefined}
                onChange={e => { setPage(1); setToDate(e.target.value); }}
                style={{ height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 10px", fontSize: 13 }} />
            </div>

            {hasFilters && (
              <button onClick={clearFilters} style={{ height: 38, padding: "0 14px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#f8f8f8", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <FaTimes size={11} /> Clear
              </button>
            )}

            <button onClick={exportExcel} disabled={exporting || loading || total === 0}
              title="Download every complaint these filters match"
              style={{ height: 38, padding: "0 14px", borderRadius: 8, border: "1px solid #15803d", background: "#15803d", color: "#fff", cursor: exporting || loading || total === 0 ? "not-allowed" : "pointer", opacity: exporting || loading || total === 0 ? 0.6 : 1, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7, marginLeft: "auto" }}>
              <FaFileExcel size={13} /> {exporting ? "Exporting..." : "Export Excel"}
            </button>
          </div>

          {/* Table */}
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f0", fontWeight: 600, fontSize: 15 }}>
              Complaints {!loading && <span style={{ color: "#aaa", fontWeight: 400, fontSize: 13 }}>({complaints.length} shown)</span>}
            </div>

            {loading ? (
              <div style={{ padding: 60, textAlign: "center", color: "#aaa" }}>Loading...</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                      {["Complaint No", "Order ID", "Customer", "Message", "Status", "Date", "Action"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.length > 0 ? complaints.map((c, idx) => (
                      <tr key={c._id} style={{ borderBottom: "1px solid #f5f5f5", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: "#6366f1" }}>{c.complaintNumber}</td>
                        <td style={{ padding: "12px 14px" }}>{c.orderId}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 500 }}>{c.user?.name || "—"}</span>
                            {/* B2B and B2C complaints sit in one list, so the side is labelled */}
                            <span style={c.user?.userType === "partner" ? b2bBadge : b2cBadge}>
                              {c.user?.userType === "partner" ? "B2B" : "B2C"}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{c.user?.phone || c.user?.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px", maxWidth: 240 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#555" }}>{c.message}</div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ ...STATUS_STYLES[c.status], borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{c.status}</span>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#888", whiteSpace: "nowrap" }}>
                          {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <Link href={`/dashboard/admin/complaints/${c._id}`}
                            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #6366f1", color: "#6366f1", fontSize: 12, fontWeight: 500, textDecoration: "none" }}>
                            View / Update
                          </Link>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
                          {hasFilters ? "No complaints match your filters." : "No complaints yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div style={{ padding: "14px 18px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 13 }}>← Previous</button>
                <span style={{ fontSize: 13, color: "#888" }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                  style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 13 }}>Next →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}