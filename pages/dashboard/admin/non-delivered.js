// pages/dashboard/admin/non-delivered.js
// Every partner (B2B) and retail (B2C) order that went out through Shiprocket
// but did not reach the buyer: failed delivery, returning, returned, lost.
"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaSyncAlt, FaExternalLinkAlt } from "react-icons/fa";

const CARD = { background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };
const MUTED = { color: "#6b7280", fontSize: 12.5 };

const GROUPS = {
  failed: { label: "Delivery failed", bg: "#fee2e2", fg: "#b91c1c" },
  returning: { label: "Returning to us", bg: "#ffedd5", fg: "#c2410c" },
  returned: { label: "Returned to us", bg: "#e0e7ff", fg: "#4338ca" },
  lost: { label: "Lost or damaged", bg: "#f3f4f6", fg: "#111827" },
};

const TYPE_TABS = [
  { key: "all", label: "All orders" },
  { key: "b2b", label: "Partner (B2B)" },
  { key: "b2c", label: "Retail (B2C)" },
];

const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

function Pill({ bg, fg, children }) {
  return (
    <span style={{ display: "inline-block", background: bg, color: fg, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function optionText(options) {
  return Object.entries(options || {})
    .filter(([, v]) => v !== "" && v !== null && v !== undefined && typeof v !== "object")
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

export default function NonDeliveredOrders() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [external, setExternal] = useState([]);
  const [shiprocket, setShiprocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [type, setType] = useState("all");
  const [group, setGroup] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/non-delivered", { withCredentials: true });
      setRows(data.rows || []);
      setExternal(data.external || []);
      setShiprocket(data.shiprocket || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load the list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const checkLatest = async () => {
    setRefreshing(true);
    try {
      const { data } = await axios.post("/api/admin/non-delivered", {}, { withCredentials: true });
      toast.success(data.message || "Checked");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not check Shiprocket");
    } finally {
      setRefreshing(false);
    }
  };

  const typeRows = useMemo(() => (type === "all" ? rows : rows.filter((r) => r.type === type)), [rows, type]);

  const groupCounts = useMemo(() => {
    const c = { all: typeRows.length };
    for (const r of typeRows) c[r.courier.group] = (c[r.courier.group] || 0) + 1;
    return c;
  }, [typeRows]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return typeRows.filter((r) => {
      if (group !== "all" && r.courier.group !== group) return false;
      if (!q) return true;
      const hay = [
        r.orderNumber,
        r.orderName,
        r.customer.name,
        r.customer.phone,
        r.customer.email,
        r.courier.awb,
        r.courier.name,
        ...r.items.map((i) => i.name),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [typeRows, group, search]);

  const typeCount = (key) => (key === "all" ? rows.length : rows.filter((r) => r.type === key).length);

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Not Delivered</span>
          <button
            type="button"
            onClick={checkLatest}
            disabled={refreshing || shiprocket?.configured === false}
            style={{ marginLeft: "auto", height: 38, padding: "0 16px", borderRadius: 8, border: "none", background: "#E10600", color: "#fff", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", opacity: refreshing ? 0.7 : 1 }}
          >
            <FaSyncAlt size={12} className={refreshing ? "fa-spin" : ""} /> {refreshing ? "Checking..." : "Check latest from Shiprocket"}
          </button>
        </nav>

        <div style={{ padding: 24 }}>
          <p style={{ ...MUTED, fontSize: 13, margin: "0 0 14px", maxWidth: 820 }}>
            Partner and retail orders sent through Shiprocket that did not reach the buyer. Statuses update on their own when the courier scans a parcel;
            use <strong>Check latest from Shiprocket</strong> to pull the newest status of parcels still on the way.
          </p>

          {shiprocket && !shiprocket.configured && (
            <div style={{ ...CARD, padding: 14, marginBottom: 14, border: "1px solid #fde68a", fontSize: 13 }}>Shiprocket is not set up on the server, so only saved statuses are shown.</div>
          )}
          {shiprocket?.configured && !shiprocket.ok && (
            <div style={{ ...CARD, padding: 14, marginBottom: 14, border: "1px solid #fde68a", fontSize: 13 }}>
              Could not load Shiprocket&apos;s non-delivery list ({shiprocket.error}). Showing the statuses saved on orders.
            </div>
          )}

          {/* Order type tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {TYPE_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                style={{
                  height: 34,
                  padding: "0 14px",
                  borderRadius: 8,
                  border: type === t.key ? "1px solid #111827" : "1px solid #e0e0e0",
                  background: type === t.key ? "#111827" : "#fff",
                  color: type === t.key ? "#fff" : "#111",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t.label} ({typeCount(t.key)})
              </button>
            ))}
          </div>

          {/* Issue filter + search */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <button type="button" onClick={() => setGroup("all")} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", opacity: group === "all" ? 1 : 0.55 }}>
              <Pill bg="#111827" fg="#fff">Every issue ({groupCounts.all || 0})</Pill>
            </button>
            {Object.entries(GROUPS).map(([k, g]) => (
              <button key={k} type="button" onClick={() => setGroup(k)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer", opacity: group === k ? 1 : 0.55 }}>
                <Pill bg={g.bg} fg={g.fg}>
                  {g.label} ({groupCounts[k] || 0})
                </Pill>
              </button>
            ))}
            <input
              id="nd-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order no., customer, AWB, product"
              style={{ marginLeft: "auto", height: 36, minWidth: 0, width: 300, maxWidth: "100%", border: "1px solid #d9d9d9", borderRadius: 8, padding: "0 10px", fontSize: 13 }}
            />
          </div>

          {loading && <div style={{ ...CARD, padding: 24, color: "#6b7280" }}>Loading...</div>}

          {!loading && shown.length === 0 && (
            <div style={{ ...CARD, padding: 32, textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{rows.length === 0 ? "Every shipped parcel was delivered or is still on the way" : "No orders match these filters"}</div>
              <div style={{ ...MUTED, marginTop: 6 }}>Orders appear here when Shiprocket reports a failed delivery, a return to origin, or a lost or damaged parcel.</div>
            </div>
          )}

          {!loading && shown.length > 0 && (
            <div style={{ ...CARD, overflowX: "auto" }}>
              <table className="table mb-0" style={{ fontSize: 13, minWidth: 960 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Courier &amp; AWB</th>
                    <th>What happened</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const g = GROUPS[r.courier.group] || GROUPS.failed;
                    return (
                      <tr key={r._id}>
                        <td style={{ verticalAlign: "top" }}>
                          <Link href={`/dashboard/admin/orders/${r._id}`} style={{ fontWeight: 700, color: "#E10600" }}>
                            #{r.orderNumber || String(r._id).slice(-6)}
                          </Link>
                          {r.orderName && <div style={MUTED}>{r.orderName}</div>}
                          <div style={{ marginTop: 4 }}>
                            {r.type === "b2b" ? <Pill bg="#dbeafe" fg="#1d4ed8">Partner</Pill> : <Pill bg="#fce7f3" fg="#be185d">Retail</Pill>}
                          </div>
                          <div style={{ ...MUTED, marginTop: 4 }}>
                            ₹{Number(r.total || 0).toLocaleString("en-IN")} · {r.paymentMethod}
                          </div>
                          <div style={MUTED}>Placed {fmtDate(r.placedAt)}</div>
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          <div style={{ fontWeight: 600 }}>{r.customer.name || "—"}</div>
                          {r.customer.phone && <div style={MUTED}>{r.customer.phone}</div>}
                          {r.customer.city && (
                            <div style={MUTED}>
                              {r.customer.city}
                              {r.customer.zip ? ` ${r.customer.zip}` : ""}
                            </div>
                          )}
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          {r.items.map((it, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                              {it.image ? (
                                <img src={it.image} alt="" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, border: "1px solid #eee", flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: 6, background: "#f3f4f6", flexShrink: 0 }} />
                              )}
                              <div>
                                <div style={{ fontWeight: 600 }}>
                                  {it.name} × {it.quantity}
                                </div>
                                {optionText(it.options) && <div style={MUTED}>{optionText(it.options)}</div>}
                              </div>
                            </div>
                          ))}
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          <div style={{ fontWeight: 600 }}>{r.courier.name || "Courier"}</div>
                          <div style={{ fontFamily: "monospace", fontSize: 12.5 }}>{r.courier.awb}</div>
                          {r.courier.trackingUrl && (
                            <a href={r.courier.trackingUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: "#E10600" }}>
                              Track parcel <FaExternalLinkAlt size={9} />
                            </a>
                          )}
                        </td>
                        <td style={{ verticalAlign: "top", maxWidth: 300 }}>
                          <Pill bg={g.bg} fg={g.fg}>{g.label}</Pill>
                          <div style={{ fontWeight: 600, marginTop: 4 }}>{r.courier.status}</div>
                          {r.ndr?.reason && (
                            <div style={{ marginTop: 2 }}>
                              <span style={MUTED}>Reason: </span>
                              {r.ndr.reason}
                            </div>
                          )}
                          {r.ndr?.attempts > 0 && <div style={MUTED}>Delivery attempts: {r.ndr.attempts}</div>}
                          {!r.ndr?.reason && r.courier.lastActivity && r.courier.lastActivity !== r.courier.status && <div style={MUTED}>{r.courier.lastActivity}</div>}
                          {r.courier.lastLocation && <div style={MUTED}>{r.courier.lastLocation}</div>}
                          <div style={{ ...MUTED, marginTop: 2 }}>Updated {fmtDate(r.courier.lastUpdate)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && external.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Also in Shiprocket ({external.length})</h3>
              <p style={{ ...MUTED, margin: "0 0 10px" }}>These parcels are in Shiprocket&apos;s non-delivery list but were not booked from this site, so they have no order here.</p>
              <div style={{ ...CARD, overflowX: "auto" }}>
                <table className="table mb-0" style={{ fontSize: 13, minWidth: 760 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th>AWB</th>
                      <th>Shiprocket order</th>
                      <th>Customer</th>
                      <th>Products</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {external.map((n) => (
                      <tr key={n.awb}>
                        <td style={{ fontFamily: "monospace" }}>
                          {n.awb}
                          {n.courierName && <div style={{ ...MUTED, fontFamily: "inherit" }}>{n.courierName}</div>}
                        </td>
                        <td>{n.channelOrderId || "—"}</td>
                        <td>
                          {n.customerName || "—"}
                          {n.customerCity && <div style={MUTED}>{n.customerCity}</div>}
                        </td>
                        <td>{n.products.length ? n.products.map((p) => `${p.name} × ${p.quantity}`).join(", ") : "—"}</td>
                        <td>
                          {n.reason || n.status || "—"}
                          {n.attempts > 0 && <div style={MUTED}>Attempts: {n.attempts}</div>}
                          {n.raisedAt && <div style={MUTED}>{fmtDate(n.raisedAt)}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
