// pages/dashboard/admin/payment-accounts/index.js
// Bank accounts and UPI QR codes partners pay into on the "Manual Payment"
// page. Add, edit or delete accounts and pick the one partners see.
"use client";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaPlus, FaPen, FaTrash, FaCheck, FaExternalLinkAlt } from "react-icons/fa";

const CARD = { background: "#fff", borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.07)" };
const LABEL = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 5 };
const INPUT = { width: "100%", height: 38, border: "1px solid #d9d9d9", borderRadius: 8, padding: "0 10px", fontSize: 14 };
const HINT = { fontSize: 11.5, color: "#6b7280", marginTop: 4 };
const BTN = { height: 32, padding: "0 10px", borderRadius: 7, border: "1px solid #e0e0e0", background: "#fff", cursor: "pointer", fontSize: 12.5, display: "inline-flex", alignItems: "center", gap: 6, color: "#111" };

const EMPTY = {
  label: "",
  firmName: "",
  bankName: "",
  accountNumber: "",
  accountType: "",
  ifsc: "",
  branch: "",
  branchAddress: "",
  upiId: "",
  qrImage: "",
  whatsappNumber: "",
};

const FIELDS = [
  { key: "label", label: "Name for this account (only admins see it)", placeholder: "e.g. UCO current account", max: 80 },
  { key: "firmName", label: "Account holder name *", placeholder: "ONE PRIME STUDIO", max: 120 },
  { key: "bankName", label: "Bank name *", placeholder: "UCO Bank", max: 120 },
  { key: "accountNumber", label: "Account number *", placeholder: "31350210001073", max: 34 },
  { key: "ifsc", label: "IFSC code *", placeholder: "UCBA0003572", max: 11 },
  { key: "accountType", label: "Account type", placeholder: "Current / Savings / CAA", max: 40 },
  { key: "branch", label: "Branch", placeholder: "Raebareli Road", max: 120 },
  { key: "upiId", label: "UPI ID", placeholder: "name@bank", max: 80 },
  { key: "whatsappNumber", label: "WhatsApp number for screenshots", placeholder: "8619765961", max: 20 },
];

function AccountDetails({ a }) {
  const rows = [
    ["Account holder", a.firmName],
    ["Bank", a.bankName],
    ["Account no.", a.accountNumber],
    ["IFSC", a.ifsc],
    ["Type", a.accountType],
    ["Branch", a.branch],
    ["UPI ID", a.upiId],
    ["WhatsApp", a.whatsappNumber],
  ].filter(([, v]) => v);
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <table style={{ fontSize: 13, flex: "1 1 260px" }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{ color: "#6b7280", padding: "2px 12px 2px 0", whiteSpace: "nowrap", verticalAlign: "top" }}>{k}</td>
              <td style={{ fontWeight: 600, wordBreak: "break-word" }}>{v}</td>
            </tr>
          ))}
          {a.branchAddress && (
            <tr>
              <td style={{ color: "#6b7280", padding: "2px 12px 2px 0", verticalAlign: "top" }}>Address</td>
              <td>{a.branchAddress}</td>
            </tr>
          )}
        </tbody>
      </table>
      {a.qrImage ? (
        <img src={a.qrImage} alt="UPI QR code" style={{ width: 120, height: 120, objectFit: "contain", border: "1px solid #eee", borderRadius: 8, background: "#fff" }} />
      ) : (
        <div style={{ width: 120, height: 120, border: "1px dashed #d1d5db", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 8 }}>
          No QR code
        </div>
      )}
    </div>
  );
}

export default function PaymentAccountsAdmin() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rows, setRows] = useState([]);
  const [builtIn, setBuiltIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | account id
  const [form, setForm] = useState(EMPTY);
  const [showNow, setShowNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [fromBuiltIn, setFromBuiltIn] = useState(false);
  const fileRef = useRef(null);
  const formRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/admin/payment-accounts", { withCredentials: true });
      setRows(data.data || []);
      setBuiltIn(data.builtIn || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load the bank accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openForm = (mode, values, builtInEdit = false) => {
    setFromBuiltIn(builtInEdit);
    setEditing(mode);
    setForm({ ...EMPTY, ...values });
    setShowNow(mode === "new");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const startNew = () => openForm("new", EMPTY);
  const startFromBuiltIn = () => {
    const { _id, builtIn: _b, label, ...rest } = builtIn || {};
    openForm("new", { ...rest, label: "Main account" }, true);
  };
  const startEdit = (a) => {
    const values = {};
    for (const k of Object.keys(EMPTY)) values[k] = a[k] || "";
    openForm(a._id, values);
  };
  const closeForm = () => {
    setEditing(null);
    setFromBuiltIn(false);
    setForm(EMPTY);
    if (fileRef.current) fileRef.current.value = "";
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const uploadQr = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("The QR picture must be 2 MB or smaller.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await axios.post("/api/admin/payment-accounts/upload-qr", body, { withCredentials: true });
      setForm((f) => ({ ...f, qrImage: data.src }));
      toast.success("QR code uploaded. Save the account to use it.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not upload the QR code");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } =
        editing === "new"
          ? await axios.post("/api/admin/payment-accounts", { ...form, isActive: showNow }, { withCredentials: true })
          : await axios.put(`/api/admin/payment-accounts/${editing}`, form, { withCredentials: true });
      toast.success(data.message || "Saved");
      closeForm();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save the account");
    } finally {
      setSaving(false);
    }
  };

  const show = async (a) => {
    setBusyId(a._id);
    try {
      const { data } = await axios.put(`/api/admin/payment-accounts/${a._id}`, { show: true }, { withCredentials: true });
      toast.success(data.message || "Updated");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update the account");
    } finally {
      setBusyId("");
    }
  };

  const remove = async (a) => {
    const name = a.label || `${a.bankName} ${a.accountNumber}`;
    const extra = a.isActive ? " Partners are seeing this account right now." : "";
    if (!window.confirm(`Delete "${name}"?${extra} This cannot be undone.`)) return;
    setBusyId(a._id);
    try {
      const { data } = await axios.delete(`/api/admin/payment-accounts/${a._id}`, { withCredentials: true });
      toast.success(data.message || "Deleted");
      if (editing === a._id) closeForm();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the account");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen((s) => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 18 }}>Bank Accounts &amp; QR</span>
          <button
            type="button"
            onClick={startNew}
            style={{ marginLeft: "auto", height: 38, padding: "0 16px", borderRadius: 8, border: "none", background: "#E10600", color: "#fff", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          >
            <FaPlus size={12} /> Add account
          </button>
        </nav>

        <div style={{ padding: 24, maxWidth: 1100 }}>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
            Partners pay into the account marked <strong>Shown to partners</strong> when they top up their wallet by bank transfer or UPI.{" "}
            <a href="/partner/wallet/manual" target="_blank" rel="noreferrer" style={{ color: "#E10600" }}>
              Open the partner page <FaExternalLinkAlt size={10} />
            </a>
          </p>

          {loading && <div style={{ ...CARD, padding: 24, color: "#6b7280" }}>Loading...</div>}

          {!loading && rows.length === 0 && builtIn && (
            <div style={{ ...CARD, padding: 18, marginBottom: 18, border: "1px solid #fde68a" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Partners see the built-in details right now</div>
                  <div style={{ fontSize: 12.5, color: "#6b7280" }}>Click Edit to change these details or the QR code. Partners see your changes as soon as you save.</div>
                </div>
                <button type="button" style={{ ...BTN, height: 36, borderColor: "#E10600", color: "#E10600", fontWeight: 600 }} onClick={startFromBuiltIn}>
                  <FaPen size={11} /> Edit
                </button>
              </div>
              <AccountDetails a={builtIn} />
            </div>
          )}

          {!loading &&
            rows.map((a) => (
              <div key={a._id} style={{ ...CARD, padding: 18, marginBottom: 14, border: a.isActive ? "2px solid #16a34a" : "1px solid transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{a.label || a.bankName}</div>
                    {a.isActive ? (
                      <span style={{ display: "inline-block", marginTop: 4, background: "#dcfce7", color: "#15803d", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>Shown to partners</span>
                    ) : (
                      <span style={{ display: "inline-block", marginTop: 4, background: "#f3f4f6", color: "#6b7280", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>Not shown</span>
                    )}
                  </div>
                  <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                    {!a.isActive && (
                      <button type="button" style={{ ...BTN, color: "#15803d" }} disabled={busyId === a._id} onClick={() => show(a)}>
                        <FaCheck size={11} /> Show to partners
                      </button>
                    )}
                    <button type="button" style={BTN} onClick={() => startEdit(a)}>
                      <FaPen size={11} /> Edit
                    </button>
                    <button type="button" style={{ ...BTN, color: "#b91c1c" }} disabled={busyId === a._id} onClick={() => remove(a)}>
                      <FaTrash size={11} /> Delete
                    </button>
                  </div>
                </div>
                <AccountDetails a={a} />
              </div>
            ))}

          {editing && (
            <form ref={formRef} onSubmit={save} style={{ ...CARD, padding: 20, marginTop: 8 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 16px" }}>{editing === "new" && !fromBuiltIn ? "Add a bank account" : "Edit bank account"}</h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                {FIELDS.map((f) => (
                  <div key={f.key}>
                    <label htmlFor={`pa-${f.key}`} style={LABEL}>{f.label}</label>
                    <input
                      id={`pa-${f.key}`}
                      style={{ ...INPUT, textTransform: f.key === "ifsc" ? "uppercase" : "none" }}
                      value={form[f.key]}
                      onChange={set(f.key)}
                      placeholder={f.placeholder}
                      maxLength={f.max}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <label htmlFor="pa-branchAddress" style={LABEL}>Branch address</label>
                <textarea
                  id="pa-branchAddress"
                  style={{ ...INPUT, height: 70, padding: 10, resize: "vertical" }}
                  value={form.branchAddress}
                  onChange={set("branchAddress")}
                  maxLength={300}
                  placeholder="590/181, Sai Tower, Sai Vihar, Lucknow, UP 226025"
                />
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <span style={LABEL}>UPI QR code</span>
                  {form.qrImage ? (
                    <img src={form.qrImage} alt="QR code preview" style={{ width: 150, height: 150, objectFit: "contain", border: "1px solid #eee", borderRadius: 8, background: "#fff" }} />
                  ) : (
                    <div style={{ width: 150, height: 150, border: "1px dashed #d1d5db", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9ca3af" }}>No QR code</div>
                  )}
                </div>
                <div style={{ flex: "1 1 260px" }}>
                  <label htmlFor="pa-qr" style={LABEL}>{form.qrImage ? "Replace the QR code" : "Upload a QR code"}</label>
                  <input id="pa-qr" ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="form-control" disabled={uploading} onChange={uploadQr} />
                  <div style={HINT}>{uploading ? "Uploading..." : "PNG, JPG or WebP, up to 2 MB. It should be the QR for this same account."}</div>
                  {form.qrImage && (
                    <button type="button" style={{ ...BTN, marginTop: 10, color: "#b91c1c" }} onClick={() => setForm((f) => ({ ...f, qrImage: "" }))}>
                      <FaTrash size={11} /> Remove QR code
                    </button>
                  )}
                </div>
              </div>

              {editing === "new" && !fromBuiltIn && (
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, fontSize: 14, cursor: "pointer" }}>
                  <input type="checkbox" checked={showNow} onChange={(e) => setShowNow(e.target.checked)} />
                  Show this account to partners straight away
                </label>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="submit" disabled={saving || uploading} style={{ height: 40, padding: "0 20px", borderRadius: 8, border: "none", background: "#111827", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                  {saving ? "Saving..." : editing === "new" && !fromBuiltIn ? "Save account" : "Save changes"}
                </button>
                <button type="button" onClick={closeForm} style={{ ...BTN, height: 40, padding: "0 16px" }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
