// pages/dashboard/admin/invoices/[id]/edit.js
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import Link from "next/link";
import { FiArrowLeft, FiPlus, FiTrash2, FiSave } from "react-icons/fi";

export default function InvoiceEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [items, setItems]           = useState([]);
  const [gstPercent, setGstPercent] = useState(18);
  const [gstType, setGstType]       = useState("INTRA");
  const [partnerType, setPartnerType] = useState("B2B");
  const [remarks, setRemarks]       = useState("");
  const [sellerGst, setSellerGst]   = useState("");
  const [sellerAddress, setSellerAddress] = useState("");

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/admin/invoices/${id}`, { withCredentials: true })
      .then(r => {
        const inv = r.data;
        setInvoice(inv);
        setItems(inv.items || []);
        setGstPercent(inv.gstPercent || 18);
        setGstType(inv.gstType || "INTRA");
        setPartnerType(inv.partnerType || "B2B");
        setRemarks(inv.remarks || "");
        setSellerGst(inv.sellerGst || "");
        setSellerAddress(inv.sellerAddress || "");
      })
      .catch(() => toast.error("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === "qty" || field === "rate") {
      updated[index].amount = Number(updated[index].qty || 0) * Number(updated[index].rate || 0);
      updated[index].taxableAmount = updated[index].amount;
    }
    setItems(updated);
  };

  const addItem = () => setItems([...items, { description: "", hsnCode: "", qty: 1, rate: 0, amount: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const subTotal = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  let cgstAmt = 0, sgstAmt = 0, igstAmt = 0;
  if (gstType === "INTRA") { cgstAmt = subTotal * (gstPercent / 2) / 100; sgstAmt = cgstAmt; }
  if (gstType === "INTER") { igstAmt = subTotal * gstPercent / 100; }
  const gstAmount  = cgstAmt + sgstAmt + igstAmt;
  const grandTotal = subTotal + gstAmount;

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  const handleSave = async () => {
    if (!items.length) return toast.error("At least one item required");
    setSaving(true);
    try {
      await axios.put(`/api/admin/invoices/${id}`,
        { items, gstPercent, gstType, partnerType, remarks, sellerGst, sellerAddress },
        { withCredentials: true }
      );
      toast.success("Invoice updated");
      router.push(`/dashboard/admin/invoices/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>Loading...</div>;
  if (!invoice) return null;

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>

        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(s => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 16 }}>☰</button>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Edit Invoice</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Link href={`/dashboard/admin/invoices/${id}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e5e5e5", color: "#374151", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <FiArrowLeft size={12} /> Cancel
            </Link>
            <button onClick={handleSave} disabled={saving}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 18px", borderRadius: 8, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <FiSave size={12} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </nav>

        <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>

          {/* Invoice info banner */}
          <div style={{ background: "#f5f3ff", border: "1.5px solid #c4b5fd", borderRadius: 12, padding: "12px 18px", marginBottom: 20, fontSize: 13, color: "#5b21b6" }}>
            Editing invoice <strong>{invoice.invoiceNumber}</strong> for <strong>{invoice.partnerName}</strong> · Order #{invoice.orderNumber}
          </div>

          {/* Settings row */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0f0f0", padding: "20px 24px", marginBottom: 16 }}>
            <p style={secLbl}>Invoice Settings</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
              <div>
                <label style={lbl}>Partner Type</label>
                <select value={partnerType} onChange={e => setPartnerType(e.target.value)} style={sel}>
                  <option value="B2B">B2B (Registered)</option>
                  <option value="B2C">B2C (Individual)</option>
                  <option value="UNREGISTERED">Unregistered</option>
                </select>
              </div>
              <div>
                <label style={lbl}>GST Type</label>
                <select value={gstType} onChange={e => setGstType(e.target.value)} style={sel}>
                  <option value="INTRA">Intra-State (CGST+SGST)</option>
                  <option value="INTER">Inter-State (IGST)</option>
                  <option value="NONE">No GST</option>
                </select>
              </div>
              <div>
                <label style={lbl}>GST %</label>
                <select value={gstPercent} onChange={e => setGstPercent(Number(e.target.value))} style={sel} disabled={gstType === "NONE"}>
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Your GSTIN</label>
                <input value={sellerGst} onChange={e => setSellerGst(e.target.value)} placeholder="Your company GSTIN" style={inp} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <label style={lbl}>Your Address (for invoice)</label>
              <textarea value={sellerAddress} onChange={e => setSellerAddress(e.target.value)} rows={2}
                placeholder="Your company full address" style={{ ...inp, resize: "vertical" }} />
            </div>
          </div>

          {/* Items */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0f0f0", padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ ...secLbl, margin: 0 }}>Invoice Items</p>
              <button onClick={addItem}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 8, border: "1.5px solid #e5e5e5", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                <FiPlus size={11} /> Add Item
              </button>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 80px 80px 90px 90px 36px", gap: 8, marginBottom: 8 }}>
              {["Description","HSN/SAC","Qty","Rate","Taxable","Amount",""].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
              ))}
            </div>

            {items.map((item, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 100px 80px 80px 90px 90px 36px", gap: 8, marginBottom: 8, alignItems: "center" }}>
                <input value={item.description} onChange={e => handleItemChange(i, "description", e.target.value)} placeholder="Product/service description" style={inp} />
                <input value={item.hsnCode || ""} onChange={e => handleItemChange(i, "hsnCode", e.target.value)} placeholder="HSN" style={inp} />
                <input type="number" value={item.qty} onChange={e => handleItemChange(i, "qty", e.target.value)} style={inp} />
                <input type="number" value={item.rate} onChange={e => handleItemChange(i, "rate", e.target.value)} style={inp} />
                <input value={`₹${(Number(item.qty || 0) * Number(item.rate || 0)).toFixed(2)}`} disabled style={{ ...inp, background: "#f9fafb", color: "#6b7280" }} />
                <input value={`₹${Number(item.amount || 0).toFixed(2)}`} disabled style={{ ...inp, background: "#f9fafb", fontWeight: 700 }} />
                <button onClick={() => removeItem(i)} disabled={items.length === 1}
                  style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#b91c1c", cursor: items.length === 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FiTrash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Live totals */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0f0f0", padding: "20px 24px", marginBottom: 16 }}>
            <p style={secLbl}>Live Totals</p>
            <div style={{ maxWidth: 320, marginLeft: "auto" }}>
              {[
                { label: "Taxable Value", value: fmt(subTotal) },
                ...(gstType === "INTRA" ? [
                  { label: `CGST @ ${gstPercent / 2}%`, value: fmt(cgstAmt) },
                  { label: `SGST @ ${gstPercent / 2}%`, value: fmt(sgstAmt) },
                ] : gstType === "INTER" ? [
                  { label: `IGST @ ${gstPercent}%`, value: fmt(igstAmt) },
                ] : []),
                { label: "Total Tax", value: fmt(gstAmount), bold: true },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ fontSize: 13, color: r.bold ? "#111" : "#6b7280", fontWeight: r.bold ? 700 : 400 }}>{r.label}</span>
                  <span style={{ fontSize: 13, fontWeight: r.bold ? 700 : 500 }}>{r.value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Grand Total</span>
                <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px" }}>{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0f0f0", padding: "20px 24px" }}>
            <label style={lbl}>Remarks</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
              placeholder="Any additional notes..." style={{ ...inp, resize: "vertical" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const secLbl = { margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" };
const lbl    = { display: "block", fontSize: 11, fontWeight: 600, color: "#6b7280", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" };
const sel    = { width: "100%", padding: "9px 11px", border: "1.5px solid #e5e5e5", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box" };
const inp    = { width: "100%", padding: "9px 11px", border: "1.5px solid #e5e5e5", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box" };