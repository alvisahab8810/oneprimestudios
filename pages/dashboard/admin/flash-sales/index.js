// pages/dashboard/admin/flash-sales/index.js — every flash sale, with its status.
// A deal runs between its start and end time. Once the end time passes it
// disappears from the shop by itself; edit the times to run it again.
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaPlus, FaPen, FaTrash, FaExternalLinkAlt } from "react-icons/fa";

const CARD = { background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };

const STATUS = {
  live: { label: "Live", bg: "#dcfce7", color: "#15803d" },
  scheduled: { label: "Scheduled", bg: "#e0e7ff", color: "#4338ca" },
  ended: { label: "Ended", bg: "#f3f4f6", color: "#6b7280" },
  off: { label: "Switched off", bg: "#fee2e2", color: "#b91c1c" },
};

const fmt = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

function timeNote(s, now) {
  const end = new Date(s.endsAt).getTime();
  const start = new Date(s.startsAt).getTime();
  const span = (ms) => {
    const m = Math.max(0, Math.round(ms / 60000));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h} hr${h === 1 ? "" : "s"} ${m % 60} min`;
    return `${Math.floor(h / 24)} days`;
  };
  if (s.status === "live") return `Ends in ${span(end - now)}`;
  if (s.status === "scheduled") return `Starts in ${span(start - now)}`;
  if (s.status === "ended") return "Change the end time to run it again";
  return "Turn it on in the editor";
}

export default function FlashSalesAdmin() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offsetMs, setOffsetMs] = useState(0);
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/flash-sales", { withCredentials: true });
      setRows(data.data || []);
      if (data.serverNow) setOffsetMs(new Date(data.serverNow).getTime() - Date.now());
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load flash sales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (s) => {
    if (!window.confirm(`Delete the flash sale "${s.title}"? This cannot be undone.`)) return;
    setBusyId(s._id);
    try {
      await axios.delete(`/api/admin/flash-sales/${s._id}`, { withCredentials: true });
      toast.success("Flash sale deleted");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the flash sale");
    } finally {
      setBusyId("");
    }
  };

  const now = Date.now() + offsetMs;
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  const stats = [
    { label: "All deals", value: rows.length, color: "#111" },
    { label: "Live now", value: counts.live || 0, color: "#15803d" },
    { label: "Scheduled", value: counts.scheduled || 0, color: "#4338ca" },
    { label: "Ended", value: counts.ended || 0, color: "#6b7280" },
  ];
  const btn = { height: 32, padding: "0 10px", borderRadius: 7, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6, color: "#111", textDecoration: "none" };

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Flash Sales</span>
          <Link
            href="/dashboard/admin/flash-sales/new"
            style={{ marginLeft: "auto", height: 38, padding: "0 16px", borderRadius: 8, background: "#E10600", color: "#fff", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
          >
            <FaPlus size={12} /> New flash sale
          </Link>
        </nav>

        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 16, marginBottom: 20 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ ...CARD, padding: "16px 18px" }}>
                <div style={{ fontSize: 12.5, color: "#6b7280" }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px" }}>
            Flash sales are for retail (B2C) buyers only. A live deal shows on the home page and on its own page, and its price is used in the cart. When the end time passes, all of that stops by itself.
          </p>

          <div style={{ ...CARD, overflowX: "auto" }}>
            <table className="table mb-0" style={{ fontSize: 13.5, minWidth: 820 }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={{ padding: "12px 16px" }}>Deal</th>
                  <th>Status</th>
                  <th>Deal price</th>
                  <th>Products</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>Loading...</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
                      No flash sales yet. Create one, add products, set the price and the end time.
                    </td>
                  </tr>
                )}
                {!loading &&
                  rows.map((s) => {
                    const st = STATUS[s.status] || STATUS.off;
                    return (
                      <tr key={s._id}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600 }}>{s.title}</div>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>/flash-sale/{s.slug}{s.showOnHome ? "" : " · not on home page"}</div>
                        </td>
                        <td>
                          <span style={{ background: st.bg, color: st.color, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                          <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 4 }}>{timeNote(s, now)}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>₹{Number(s.dealPrice).toLocaleString("en-IN")}</td>
                        <td>{s.productCount}</td>
                        <td>{fmt(s.startsAt)}</td>
                        <td>{fmt(s.endsAt)}</td>
                        <td style={{ textAlign: "right", paddingRight: 16, whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            {s.status === "live" && (
                              <a href={`/flash-sale/${s.slug}`} target="_blank" rel="noreferrer" style={btn} title="Open the deal page">
                                <FaExternalLinkAlt size={11} /> View
                              </a>
                            )}
                            <Link href={`/dashboard/admin/flash-sales/${s._id}`} style={btn}>
                              <FaPen size={11} /> Edit
                            </Link>
                            <button type="button" style={{ ...btn, color: "#b91c1c" }} disabled={busyId === s._id} onClick={() => remove(s)}>
                              <FaTrash size={11} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
