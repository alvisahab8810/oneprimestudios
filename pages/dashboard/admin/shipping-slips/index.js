// pages/dashboard/admin/shipping-slips/index.js — the packing desk.
// Lists B2B and B2C orders that are packed or dispatched, lets the desk add
// boxes / weight / a handling note, and prints the slip that goes on each box.
"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaSearch, FaTimes, FaPrint, FaPen, FaBoxOpen } from "react-icons/fa";
import { MAX_BOXES, MAX_NOTE, MAX_DIMENSIONS } from "@/lib/shippingSlips";

const INPUT = { height: 38, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 13, background: "#fff", boxSizing: "border-box" };
const CARD = { background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };
const TABS = [
  { id: "ready", label: "Ready to dispatch" },
  { id: "dispatched", label: "Dispatched" },
  { id: "all", label: "All" },
];

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

const openPrint = (ids) => {
  if (!ids.length) return;
  window.open(`/dashboard/admin/shipping-slips/print?ids=${ids.join(",")}`, "_blank", "noopener");
};

function PackingModal({ row, onClose, onSaved }) {
  const [form, setForm] = useState({
    boxes: row.slip?.boxes || 1,
    weightKg: row.slip?.weightKg || "",
    dimensions: row.slip?.dimensions || "",
    note: row.slip?.note || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (andPrint) => {
    const boxes = parseInt(form.boxes, 10);
    if (!Number.isFinite(boxes) || boxes < 1 || boxes > MAX_BOXES) {
      toast.error(`Boxes must be between 1 and ${MAX_BOXES}`);
      return;
    }
    setSaving(true);
    try {
      await axios.patch(`/api/admin/shipping-slips/${row._id}`, { ...form, boxes }, { withCredentials: true });
      toast.success("Packing details saved");
      onSaved();
      if (andPrint) openPrint([row._id]);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save the packing details");
    } finally {
      setSaving(false);
    }
  };

  const label = { fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="pack-title" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ ...CARD, width: "100%", maxWidth: 460, padding: 22 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <h5 id="pack-title" style={{ margin: 0, fontWeight: 700 }}>Packing details</h5>
          <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", background: "none", border: 0, cursor: "pointer" }}><FaTimes /></button>
        </div>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
          Order {row.orderNumber} · {row.shipping?.name}. These print on the slip. One slip is printed for each box.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label htmlFor="pk-boxes" style={label}>Boxes</label>
            <input id="pk-boxes" type="number" min={1} max={MAX_BOXES} value={form.boxes} onChange={set("boxes")} style={{ ...INPUT, width: "100%" }} />
          </div>
          <div>
            <label htmlFor="pk-weight" style={label}>Total weight (kg)</label>
            <input id="pk-weight" type="number" min={0} step="0.01" value={form.weightKg} onChange={set("weightKg")} placeholder="e.g. 1.5" style={{ ...INPUT, width: "100%" }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="pk-dim" style={label}>Box size (optional)</label>
          <input id="pk-dim" maxLength={MAX_DIMENSIONS} value={form.dimensions} onChange={set("dimensions")} placeholder="e.g. 30 x 20 x 10 cm" style={{ ...INPUT, width: "100%" }} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="pk-note" style={label}>Handling note (optional)</label>
          <input id="pk-note" maxLength={MAX_NOTE} value={form.note} onChange={set("note")} placeholder="e.g. Fragile - handle with care" style={{ ...INPUT, width: "100%" }} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" onClick={onClose} style={{ height: 38, padding: "0 14px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer" }}>Cancel</button>
          <button type="button" disabled={saving} onClick={() => save(false)} style={{ height: 38, padding: "0 14px", borderRadius: 8, border: "1px solid #111", background: "#fff", fontWeight: 600, cursor: "pointer" }}>Save</button>
          <button type="button" disabled={saving} onClick={() => save(true)} style={{ height: 38, padding: "0 14px", borderRadius: 8, border: 0, background: "#E10600", color: "#fff", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <FaPrint size={12} /> Save and print
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShippingSlipsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stage, setStage] = useState("ready");
  const [side, setSide] = useState("");
  const [printed, setPrinted] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/shipping-slips", {
        params: { stage, side, printed, search, page, limit: 20 },
        withCredentials: true,
      });
      setRows(data.data || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setSummary(data.summary || {});
    } catch (err) {
      if (err?.response?.status === 401) window.location.href = "/dashboard/admin/login";
      else toast.error(err?.response?.data?.message || "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [stage, side, printed, search, page]);

  useEffect(() => {
    load();
    setSelected([]);
  }, [load]);

  // Coming back from the print tab shows the new print counts
  useEffect(() => {
    const back = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [load]);

  const allOnPage = rows.length > 0 && rows.every((r) => selected.includes(r._id));
  const toggleAll = () => setSelected(allOnPage ? [] : rows.map((r) => r._id));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const stats = [
    { label: "Ready to dispatch", value: summary.ready ?? 0, color: "#111111" },
    { label: "Ready, slip not printed", value: summary.readyNotPrinted ?? 0, color: "#E10600" },
    { label: "Dispatched", value: summary.dispatched ?? 0, color: "#15803d" },
    { label: "Slips printed today", value: summary.printedToday ?? 0, color: "#6366f1" },
  ];

  const chip = (active) => ({
    height: 34, padding: "0 14px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: active ? "1px solid #111" : "1px solid #e0e0e0", background: active ? "#111" : "#fff", color: active ? "#fff" : "#374151",
  });
  const btn = { height: 32, padding: "0 10px", borderRadius: 7, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6 };
  const th = { padding: "10px 12px", fontSize: 12, fontWeight: 600, color: "#6b7280", textAlign: "left", whiteSpace: "nowrap", borderBottom: "1px solid #eee" };
  const td = { padding: "12px", fontSize: 13, verticalAlign: "top", borderBottom: "1px solid #f3f4f6" };

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Shipping Slips</span>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => openPrint(selected)}
            style={{ marginLeft: "auto", height: 38, padding: "0 16px", borderRadius: 8, border: 0, background: selected.length ? "#E10600" : "#f3a3a0", color: "#fff", fontWeight: 600, cursor: selected.length ? "pointer" : "default", display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <FaPrint size={13} /> Print selected{selected.length ? ` (${selected.length})` : ""}
          </button>
        </nav>

        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 16, marginBottom: 20 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ ...CARD, padding: "16px 20px", borderLeft: `4px solid ${s.color}` }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ ...CARD, padding: 16, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {TABS.map((t) => (
                <button key={t.id} type="button" style={chip(stage === t.id)} onClick={() => { setStage(t.id); setPage(1); }}>{t.label}</button>
              ))}
            </div>
            <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
              <FaSearch size={12} color="#9ca3af" style={{ position: "absolute", left: 12, top: 13 }} />
              <input
                id="slip-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Order no, name, phone, PIN or AWB"
                style={{ ...INPUT, width: "100%", paddingLeft: 32 }}
              />
            </div>
            <select id="slip-side" value={side} onChange={(e) => { setSide(e.target.value); setPage(1); }} style={INPUT} aria-label="B2B or B2C">
              <option value="">B2B and B2C</option>
              <option value="b2b">B2B only</option>
              <option value="b2c">B2C only</option>
            </select>
            <select id="slip-printed" value={printed} onChange={(e) => { setPrinted(e.target.value); setPage(1); }} style={INPUT} aria-label="Slip printed">
              <option value="">Printed or not</option>
              <option value="no">Not printed</option>
              <option value="yes">Printed</option>
            </select>
          </div>

          <div style={{ ...CARD, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 36 }}>
                    <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on this page" />
                  </th>
                  <th style={th}>Order</th>
                  <th style={th}>Ship to</th>
                  <th style={th}>Contents</th>
                  <th style={th}>Payment</th>
                  <th style={th}>Courier</th>
                  <th style={th}>Packing</th>
                  <th style={th}>Slip</th>
                  <th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: "#6b7280", padding: 32 }}>Loading...</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ ...td, textAlign: "center", color: "#6b7280", padding: 40 }}>
                      <FaBoxOpen size={28} color="#d1d5db" style={{ display: "block", margin: "0 auto 8px" }} />
                      {stage === "ready"
                        ? "No orders are waiting for dispatch. Orders show here once their status is Order Ready or In Packaging."
                        : "No orders match these filters."}
                    </td>
                  </tr>
                )}
                {!loading && rows.map((r) => {
                  const printedCount = r.slip?.printCount || 0;
                  return (
                    <tr key={r._id} style={{ background: selected.includes(r._id) ? "#fff7f7" : "transparent" }}>
                      <td style={td}>
                        <input type="checkbox" checked={selected.includes(r._id)} onChange={() => toggle(r._id)} aria-label={`Select order ${r.orderNumber}`} />
                      </td>
                      <td style={td}>
                        <Link href={`/dashboard/admin/orders/${r._id}`} style={{ fontWeight: 700, color: "#111" }}>{r.orderNumber}</Link>
                        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: r.side === "B2B" ? "#eef2ff" : "#ecfdf3", color: r.side === "B2B" ? "#4338ca" : "#15803d" }}>{r.side}</span>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>{r.status}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 2 }}>{fmtDate(r.createdAt)}</div>
                      </td>
                      <td style={td}>
                        <div style={{ fontWeight: 600 }}>{r.shipping?.name || r.customer || "—"}</div>
                        {r.side === "B2B" && r.customer && r.customer !== r.shipping?.name && (
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{r.customer}</div>
                        )}
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {[r.shipping?.city, r.shipping?.zip].filter(Boolean).join(" · ") || <span style={{ color: "#E10600" }}>Address missing</span>}
                        </div>
                        {r.shipping?.phone && <div style={{ fontSize: 12, color: "#6b7280" }}>{r.shipping.phone}</div>}
                      </td>
                      <td style={{ ...td, maxWidth: 220 }}>
                        {r.items.slice(0, 2).map((it, i) => (
                          <div key={i} style={{ fontSize: 12.5 }}>{it.quantity}× {it.name}</div>
                        ))}
                        {r.items.length > 2 && <div style={{ fontSize: 12, color: "#6b7280" }}>+ {r.items.length - 2} more</div>}
                      </td>
                      <td style={td}>
                        {r.cod > 0 ? (
                          <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "#111", color: "#fff", whiteSpace: "nowrap" }}>COD {money(r.cod)}</span>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 4, border: "1px solid #d1d5db", color: "#374151" }}>Prepaid</span>
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ fontSize: 12.5 }}>{r.courier || <span style={{ color: "#9ca3af" }}>Not booked</span>}</div>
                        {r.awbCode && <div style={{ fontSize: 12, color: "#6b7280" }}>AWB {r.awbCode}</div>}
                      </td>
                      <td style={td}>
                        <div style={{ fontSize: 12.5 }}>{r.slip?.boxes || 1} box{(r.slip?.boxes || 1) > 1 ? "es" : ""}</div>
                        {r.slip?.weightKg > 0 && <div style={{ fontSize: 12, color: "#6b7280" }}>{r.slip.weightKg} kg</div>}
                        {r.slip?.note && <div style={{ fontSize: 12, color: "#b45309", maxWidth: 140 }}>{r.slip.note}</div>}
                      </td>
                      <td style={td}>
                        {printedCount > 0 ? (
                          <>
                            <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#ecfdf3", color: "#15803d", whiteSpace: "nowrap" }}>
                              Printed{printedCount > 1 ? ` ×${printedCount}` : ""}
                            </span>
                            <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 3 }}>
                              {fmtDateTime(r.slip.lastPrintedAt)}{r.slip.lastPrintedBy ? ` · ${r.slip.lastPrintedBy}` : ""}
                            </div>
                          </>
                        ) : (
                          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#fef2f2", color: "#E10600", whiteSpace: "nowrap" }}>Not printed</span>
                        )}
                      </td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button type="button" style={btn} onClick={() => setEditing(r)}><FaPen size={11} /> Packing</button>
                          <button type="button" style={{ ...btn, borderColor: "#111", fontWeight: 600 }} onClick={() => openPrint([r._id])}>
                            <FaPrint size={11} /> {printedCount > 0 ? "Reprint" : "Print"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{total} order{total === 1 ? "" : "s"}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="button" style={btn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span style={{ fontSize: 13 }}>Page {page} of {totalPages}</span>
              <button type="button" style={btn} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <PackingModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
