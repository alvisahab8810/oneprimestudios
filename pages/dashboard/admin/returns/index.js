// pages/dashboard/admin/returns/index.js — Admin return / refund requests list
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaBell, FaSearch, FaTimes } from "react-icons/fa";
import { RETURN_STATUSES, RETURN_STATUS_STYLES } from "@/lib/returnRules";

export default function AdminReturnsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, open: 0 });

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);
      const res = await axios.get(`/api/admin/returns?${params}`, { withCredentials: true });
      setRequests(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
      setSummary(res.data.summary || { total: 0, open: 0 });
    } catch {
      toast.error("Failed to load return requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, page, searchQuery]);

  const hasFilters = searchQuery || statusFilter;
  const clearFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setStatusFilter("");
    setPage(1);
  };

  const stats = [
    { label: "Total requests", value: summary.total || 0, color: "#6366f1" },
    { label: "Needs action", value: summary.open || 0, color: "#f59e0b" },
    { label: "Refunded", value: summary.Refunded || 0, color: "#22c55e" },
    { label: "Rejected", value: summary.Rejected || 0, color: "#ef4444" },
  ];

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 16 }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Return &amp; Refund Requests</span>
          <div style={{ marginLeft: "auto" }}><FaBell size={18} color="#888" /></div>
        </nav>

        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 24 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderLeft: `4px solid ${s.color}` }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 200px" }}>
              <FaSearch style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 12 }} />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by request no, order no, reason..."
                style={{ width: "100%", paddingLeft: 32, height: 38, border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
              style={{ height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 13, background: "#fff", minWidth: 170 }}
            >
              <option value="">All Status</option>
              <option value="open">Needs action</option>
              {RETURN_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {hasFilters && (
              <button onClick={clearFilters} style={{ height: 38, padding: "0 14px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#f8f8f8", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <FaTimes size={11} /> Clear
              </button>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f0f0", fontWeight: 600, fontSize: 15 }}>
              Requests {!loading && <span style={{ color: "#aaa", fontWeight: 400, fontSize: 13 }}>({requests.length} of {total} shown)</span>}
            </div>

            {loading ? (
              <div style={{ padding: 60, textAlign: "center", color: "#aaa" }}>Loading...</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                      {["Request No", "Order No", "Customer", "Reason", "Photos", "Refund", "Status", "Date", "Action"].map((h) => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.4px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length > 0 ? requests.map((r, idx) => (
                      <tr key={r._id} style={{ borderBottom: "1px solid #f5f5f5", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: "#6366f1" }}>{r.requestNumber}</td>
                        <td style={{ padding: "12px 14px" }}>{r.orderNumber || "—"}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 500 }}>{r.user?.name || "—"}</div>
                          <div style={{ fontSize: 11, color: "#aaa" }}>{r.user?.phone || r.user?.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px", maxWidth: 220 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#555" }}>{r.reason}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#888" }}>{r.images?.length || 0}</td>
                        <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                          {r.refund?.refundedAt
                            ? <span style={{ color: "#15803d", fontWeight: 600 }}>₹{Number(r.refund.amount || 0).toFixed(2)}</span>
                            : <span style={{ color: "#aaa" }}>₹{Number(r.refund?.amount || 0).toFixed(2)}</span>}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ ...(RETURN_STATUS_STYLES[r.status] || {}), borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{r.status}</span>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#888", whiteSpace: "nowrap" }}>
                          {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <Link href={`/dashboard/admin/returns/${r._id}`}
                            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #6366f1", color: "#6366f1", fontSize: 12, fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>
                            View / Update
                          </Link>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: 60, color: "#aaa" }}>
                          {hasFilters ? "No requests match your filters." : "No return or refund requests yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div style={{ padding: "14px 18px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                  style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 13 }}>← Previous</button>
                <span style={{ fontSize: 13, color: "#888" }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}
                  style={{ padding: "6px 16px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 13 }}>Next →</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
