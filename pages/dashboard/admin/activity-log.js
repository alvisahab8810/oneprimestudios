import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaHistory } from "react-icons/fa";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  let h = d.getHours(), m = d.getMinutes(), ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ampm}`;
}

const ACTION_META = {
  order_status_updated: { label: "Order Status Updated", color: "#3b82f6", bg: "#eff6ff", icon: "📦" },
  partner_approved:     { label: "Partner Approved",     color: "#16a34a", bg: "#f0fdf4", icon: "✅" },
  partner_revoked:      { label: "Partner Revoked",      color: "#dc2626", bg: "#fef2f2", icon: "🚫" },
  product_added:        { label: "Product Added",        color: "#7c3aed", bg: "#f5f3ff", icon: "➕" },
  product_updated:      { label: "Product Updated",      color: "#d97706", bg: "#fffbeb", icon: "✏️" },
  product_deleted:      { label: "Product Deleted",      color: "#dc2626", bg: "#fef2f2", icon: "🗑️" },
  ops_user_created:     { label: "OPS User Created",     color: "#0891b2", bg: "#ecfeff", icon: "👤" },
  invoice_created:      { label: "Invoice Created",      color: "#059669", bg: "#ecfdf5", icon: "🧾" },
};

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  ...Object.entries(ACTION_META).map(([value, { label }]) => ({ value, label })),
];

function ActionBadge({ action }) {
  const m = ACTION_META[action] || { label: action, color: "#6b7280", bg: "#f3f4f6", icon: "•" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
      color: m.color, background: m.bg, border: `1px solid ${m.color}33`,
      whiteSpace: "nowrap",
    }}>
      {m.icon} {m.label}
    </span>
  );
}

const LIMIT = 50;

export default function ActivityLogPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const today = new Date().toISOString().slice(0, 10);
  const [logs,     setLogs]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo,   setDateTo]   = useState(today);
  const [action,   setAction]   = useState("");
  const [orderId,  setOrderId]  = useState("");
  const [orderIdDebounced, setOrderIdDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setOrderIdDebounced(orderId.trim()), 400);
    return () => clearTimeout(t);
  }, [orderId]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      // Searching by Order ID should work on its own, across all dates — the date
      // range is only applied when there's no Order ID typed in.
      if (orderIdDebounced) {
        params.orderId = orderIdDebounced;
      } else {
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo)   params.dateTo   = dateTo;
      }
      if (action)   params.action   = action;
      const { data } = await axios.get("/api/admin/activity-log", { params, withCredentials: true });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Activity log fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, action, orderIdDebounced]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / LIMIT);

  function clearFilters() {
    setDateFrom(today);
    setDateTo(today);
    setAction("");
    setOrderId("");
    setPage(1);
  }

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="container-fluid p-4">

          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="dashboard-main-h">
              <FaHistory className="me-2" /> Activity Log
            </h1>
            <span style={{
              background: "#1e293b", color: "#fff",
              borderRadius: 8, padding: "6px 16px", fontSize: 14, fontWeight: 600,
            }}>
              {total} record{total !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Filters */}
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
            padding: "16px 20px", marginBottom: 24,
            display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end",
          }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                disabled={!!orderIdDebounced}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                style={{
                  padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8,
                  fontSize: 14, outline: "none",
                  background: orderIdDebounced ? "#f1f5f9" : "#fff",
                  color: orderIdDebounced ? "#94a3b8" : "inherit",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                disabled={!!orderIdDebounced}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                style={{
                  padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8,
                  fontSize: 14, outline: "none",
                  background: orderIdDebounced ? "#f1f5f9" : "#fff",
                  color: orderIdDebounced ? "#94a3b8" : "inherit",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Order ID
              </label>
              <input
                type="text"
                placeholder="e.g. ORD-20260725-4544"
                value={orderId}
                onChange={e => { setOrderId(e.target.value); setPage(1); }}
                style={{
                  padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8,
                  fontSize: 14, outline: "none", minWidth: 200,
                }}
              />
              {orderIdDebounced && (
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  Searching all dates for this Order ID
                </div>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                Action Type
              </label>
              <select
                value={action}
                onChange={e => { setAction(e.target.value); setPage(1); }}
                style={{
                  padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8,
                  fontSize: 14, outline: "none", background: "#fff",
                }}
              >
                {ACTION_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={clearFilters}
              style={{
                padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 8,
                background: "#f1f5f9", color: "#475569", fontSize: 14, cursor: "pointer",
              }}
            >
              Reset to Today
            </button>
          </div>

          {/* Table */}
          <div style={{
            background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
            overflow: "hidden",
          }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 15 }}>
                Loading...
              </div>
            ) : logs.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
                <p style={{ color: "#64748b", fontSize: 15 }}>No activity found for the selected filters.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                      {["Date & Time", "Action", "Description", "Done By"].map(h => (
                        <th key={h} style={{
                          padding: "12px 16px", textAlign: "left", fontSize: 12,
                          fontWeight: 700, color: "#475569", textTransform: "uppercase",
                          letterSpacing: "0.05em", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr key={log._id} style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: idx % 2 === 0 ? "#fff" : "#fafafa",
                      }}>
                        <td style={{ padding: "12px 16px", minWidth: 130 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                            {fmtDate(log.createdAt)}
                          </div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                            {fmtTime(log.createdAt)}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <ActionBadge action={log.action} />
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 14, color: "#334155" }}>
                          {log.description}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                            {log.adminName || "Unknown"}
                          </div>
                          {log.adminEmail && (
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                              {log.adminEmail}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="btn btn-outline-secondary btn-sm"
              >
                Prev
              </button>
              <span style={{ padding: "4px 12px", fontSize: 14, color: "#475569" }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn btn-outline-secondary btn-sm"
              >
                Next
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
