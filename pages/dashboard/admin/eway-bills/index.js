// pages/dashboard/admin/eway-bills/index.js
// list of invoices above ₹50,000 with e-way bill status.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { downloadEwayBillPdf } from "@/lib/ewayBill";
import { FiTruck, FiDownload, FiSearch, FiSend } from "react-icons/fi";

const STATUS = {
  PENDING:   { label: "Pending",   bg: "#fef3c7", color: "#92400e" },
  DRAFT:     { label: "Draft",     bg: "#e0e7ff", color: "#3730a3" },
  GENERATED: { label: "Generated", bg: "#dcfce7", color: "#15803d" },
  CANCELLED: { label: "Cancelled", bg: "#fee2e2", color: "#b91c1c" },
};
const TABS = ["ALL", "PENDING", "DRAFT", "GENERATED", "CANCELLED"];

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const ewbFmt = (n) => (n ? n.replace(/(\d{4})(?=\d)/g, "$1 ") : "—");

export default function EwayBillsList() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ rows: [], counts: {}, threshold: 50000 });
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState("");

  const sendToCustomer = async (r) => {
    const to = window.prompt(`Send e-way bill for ${r.invoiceNumber} to:`, r.sentTo || r.partyEmail || "");
    if (to === null) return;
    if (!to.trim()) return toast.error("Enter the customer's email address");
    setSendingId(String(r.invoiceId));
    try {
      const { data: res } = await axios.post("/api/admin/eway-bills/send-email", { invoiceId: r.invoiceId, to: to.trim() }, { withCredentials: true });
      setData((d) => ({
        ...d,
        rows: d.rows.map((x) => (x.invoiceId === r.invoiceId ? { ...x, sentAt: res.sentAt, sentTo: res.sentTo, pdfUrl: res.pdfUrl } : x)),
      }));
      toast.success(`E-way bill sent to ${res.sentTo}`);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to send");
    } finally {
      setSendingId("");
    }
  };

  const download = async (r) => {
    setSendingId(`dl-${r.invoiceId}`);
    try {
      await downloadEwayBillPdf(r.invoiceId);
    } catch (e) {
      toast.error(e.message || "Failed to download PDF");
    } finally {
      setSendingId("");
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      axios
        .get("/api/admin/eway-bills", {
          params: { status: tab === "ALL" ? undefined : tab, search: search || undefined },
          withCredentials: true,
        })
        .then((r) => setData(r.data))
        .catch(() => toast.error("Failed to load e-way bills"))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [tab, search]);

  const expired = (r) => r.ewbStatus === "GENERATED" && r.validUpto && new Date(r.validUpto) < new Date();

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
        <nav style={S.topbar}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={S.burger}>☰</button>
          <FiTruck style={{ marginRight: 8 }} />
          <span style={{ fontWeight: 700, fontSize: 18 }}>E-Way Bills</span>
          <span style={{ marginLeft: 10, fontSize: 12, color: "#6b7280" }}>
            Invoices above {money(data.threshold)}
          </span>
        </nav>

        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ ...S.tab, ...(tab === t ? S.tabOn : {}) }}>
                {t === "ALL" ? "All" : STATUS[t].label}
                <span style={S.count}>{data.counts?.[t] || 0}</span>
              </button>
            ))}
            <div style={S.searchBox}>
              <FiSearch color="#9ca3af" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Invoice, party, GSTIN, EWB no, vehicle…"
                style={S.searchInput}
              />
            </div>
          </div>

          <div style={S.card}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Invoice", "Date", "Party", "Deliver To", "Value", "EWB No.", "Vehicle", "Valid Until", "Status", ""].map((h) => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} style={S.empty}>Loading…</td></tr>
                  ) : !data.rows.length ? (
                    <tr><td colSpan={10} style={S.empty}>No invoices found</td></tr>
                  ) : (
                    data.rows.map((r) => {
                      const st = STATUS[r.ewbStatus];
                      return (
                        <tr key={r.invoiceId}>
                          <td style={{ ...S.td, fontWeight: 700 }}>{r.invoiceNumber}</td>
                          <td style={S.td}>{day(r.invoiceDate)}</td>
                          <td style={S.td}>
                            <div style={{ fontWeight: 600 }}>{r.partyName}</div>
                            <div style={{ fontSize: 11, color: "#6b7280" }}>{r.partyGstin || "URP"}</div>
                          </td>
                          <td style={S.td}>{r.toCity || "—"}</td>
                          <td style={{ ...S.td, fontWeight: 700 }}>{money(r.value)}</td>
                          <td style={{ ...S.td, fontFamily: "monospace" }}>{ewbFmt(r.ewbNumber)}</td>
                          <td style={S.td}>{r.vehicleNumber || "—"}</td>
                          <td style={{ ...S.td, color: expired(r) ? "#b91c1c" : undefined }}>
                            {day(r.validUpto)}{expired(r) ? " (expired)" : ""}
                          </td>
                          <td style={S.td}>
                            <span style={{ ...S.badge, background: st.bg, color: st.color }}>{st.label}</span>
                            {r.sentAt && (
                              <div style={{ fontSize: 11, color: "#15803d", marginTop: 4 }} title={r.sentTo}>Sent {day(r.sentAt)}</div>
                            )}
                          </td>
                          <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                            <Link href={`/dashboard/admin/eway-bills/${r.invoiceId}`} style={S.btnDark}>
                              {r.ewbStatus === "PENDING" ? "Create" : "Open"}
                            </Link>
                            {r.ewbStatus === "GENERATED" && (
                              <button
                                onClick={() => sendToCustomer(r)}
                                disabled={!!sendingId}
                                style={{ ...S.btnIcon, background: "#15803d", borderColor: "#15803d", color: "#fff", cursor: "pointer", opacity: sendingId ? 0.6 : 1 }}
                                title={r.sentAt ? `Resend to customer (last sent to ${r.sentTo})` : "Send to customer"}
                              >
                                {sendingId === String(r.invoiceId) ? "…" : <FiSend size={13} />}
                              </button>
                            )}
                            {r.ewbStatus !== "PENDING" && (
                              <button
                                onClick={() => download(r)}
                                disabled={!!sendingId}
                                style={{ ...S.btnIcon, background: "#fff", cursor: "pointer", opacity: sendingId ? 0.6 : 1 }}
                                title="Download PDF"
                              >
                                {sendingId === `dl-${r.invoiceId}` ? "…" : <FiDownload size={13} />}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  topbar: { background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100 },
  burger: { background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 16 },
  tab: { display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e5e5e5", background: "#fff", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" },
  tabOn: { background: "#111", color: "#fff", borderColor: "#111" },
  count: { fontSize: 11, padding: "1px 7px", borderRadius: 20, background: "rgba(127,127,127,.18)" },
  searchBox: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e5e5e5", borderRadius: 8, padding: "6px 12px", minWidth: 280 },
  searchInput: { border: "none", outline: "none", fontSize: 13, width: "100%" },
  card: { background: "#fff", border: "1px solid #eee", borderRadius: 12 },
  th: { textAlign: "left", padding: "11px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "#6b7280", borderBottom: "1px solid #eee", whiteSpace: "nowrap" },
  td: { padding: "11px 14px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  empty: { padding: 40, textAlign: "center", color: "#9ca3af" },
  badge: { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 },
  btnDark: { display: "inline-block", padding: "6px 14px", borderRadius: 8, background: "#111", color: "#fff", fontSize: 12, fontWeight: 600, textDecoration: "none" },
  btnIcon: { display: "inline-flex", marginLeft: 6, padding: 7, borderRadius: 8, border: "1.5px solid #e5e5e5", color: "#374151", verticalAlign: "middle" },
};
