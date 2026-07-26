// pages/dashboard/admin/invoices/[id]/index.js
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FiArrowLeft, FiEdit2, FiSend, FiDownload, FiX } from "react-icons/fi";
import { computeGstBreakdown } from "@/utils/gstBreakdown";

const STATUS_CFG = {
  DRAFT:     { bg: "#fef9c3", color: "#854d0e" },
  SENT:      { bg: "#dcfce7", color: "#15803d" },
  UPDATED:   { bg: "#dbeafe", color: "#1d4ed8" },
  CANCELLED: { bg: "#fee2e2", color: "#b91c1c" },
};

export default function InvoiceViewAdmin() {
  const router = useRouter();
  const { id } = router.query;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [canViewPayments, setCanViewPayments] = useState(false);

  useEffect(() => {
    if (!id) return;
    // Fetch admin role to check payment visibility
    axios.get("/api/admin/me", { withCredentials: true })
      .then(r => {
        const role = r.data?.role;
        const perms = r.data?.permissions || [];
        setCanViewPayments(role === "admin" || role === "super_admin" || perms.includes("payments.view"));
      }).catch(() => {});
    axios.get(`/api/admin/invoices/${id}`, { withCredentials: true })
      .then(r => setInvoice(r.data))
      .catch(() => toast.error("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSend = async () => {
    if (!confirm("Send this invoice? It will be locked after sending.")) return;
    setSending(true);
    try {
      await axios.post("/api/admin/invoices/send", { invoiceId: id }, { withCredentials: true });
      try { await axios.post("/api/admin/invoices/generate-pdf", { invoiceId: id }, { withCredentials: true }); } catch {}
      try { await axios.post("/api/admin/invoices/send-email",   { invoiceId: id }, { withCredentials: true }); } catch {}
      toast.success("Invoice sent successfully");
      router.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send");
    } finally { setSending(false); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this invoice?")) return;
    try {
      await axios.delete(`/api/admin/invoices/${id}`, { withCredentials: true });
      toast.success("Invoice cancelled");
      router.push("/dashboard/admin/invoices");
    } catch { toast.error("Failed"); }
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  if (loading) return (
    <div style={{ padding: 60, textAlign: "center", color: "#9ca3af" }}>Loading...</div>
  );
  if (!invoice) return (
    <div style={{ padding: 60, textAlign: "center" }}>Invoice not found</div>
  );

  const sc  = STATUS_CFG[invoice.status] || {};
  const inv = invoice;
  // Invoices above ₹50,000 render in a strict black & white layout —
  // no rounded corners, no fills, no colors at all. Same data, plain look.
  const isHighValue = Number(inv.grandTotal || 0) > 50000;
  const radius = (n) => (isHighValue ? 0 : n);
  const bwc = (normal) => (isHighValue ? "#000" : normal);
  const bwBg = (normal) => (isHighValue ? "#fff" : normal);
  const bwBorder = (normal) => (isHighValue ? "1px solid #000" : normal);

  // Older invoices saved before per-item GST% existed fall back to the invoice-wide rate.
  const itemsWithGst = (inv.items || []).map((it) => ({
    ...it,
    gstPercent: it.gstPercent ?? inv.gstPercent ?? 0,
  }));
  const distinctRates = [...new Set(itemsWithGst.map((it) => Number(it.gstPercent || 0)))];
  const { rows: gstRows } = inv.gstType !== "NONE"
    ? computeGstBreakdown(itemsWithGst, inv.gstType)
    : { rows: [] };

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />
      <div className="main-area" style={{ flex: 1, minWidth: 0, fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>

        {/* Topbar */}
        <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "0 24px", height: 60, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(s => !s)} style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: 8, padding: "6px 12px", cursor: "pointer", marginRight: 16 }}>☰</button>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Invoice</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Link href="/dashboard/admin/invoices"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e5e5e5", color: "#374151", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              <FiArrowLeft size={12} /> Back
            </Link>
            {(inv.status === "DRAFT" || inv.status === "UPDATED" || inv.status === "SENT") && (
              <Link href={`/dashboard/admin/invoices/${id}/edit`}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e5e5e5", color: "#374151", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                <FiEdit2 size={12} /> Edit
              </Link>
            )}
            <button
              onClick={async () => {
                try {
                  const r = await axios.post("/api/admin/invoices/generate-pdf", { invoiceId: id }, { withCredentials: true });
                  const url = r.data?.pdfUrl;
                  if (url) window.open(url, "_blank");
                  else { toast.success("PDF generated"); router.reload(); }
                } catch { toast.error("Failed to generate PDF"); }
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e5e5e5", color: "#374151", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <FiDownload size={12} /> Generate PDF
            </button>
            {inv.pdfUrl && (
              <a href={inv.pdfUrl} target="_blank" rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #e5e5e5", color: "#374151", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                <FiDownload size={12} /> Download PDF
              </a>
            )}
            {(inv.status === "DRAFT" || inv.status === "UPDATED") && (
              <>
                <button onClick={handleSend} disabled={sending}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  <FiSend size={12} /> {sending ? "Sending..." : "Send Invoice"}
                </button>
                <button onClick={handleCancel}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #fca5a5", color: "#b91c1c", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <FiX size={12} /> Cancel
                </button>
              </>
            )}
          </div>
        </nav>

        <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>

          {/* ── Invoice card ── */}
          <div style={{ background: "#fff", borderRadius: radius(16), border: isHighValue ? "1.5px solid #000" : "1.5px solid #f0f0f0", padding: "36px 40px", boxShadow: isHighValue ? "none" : "0 2px 12px rgba(0,0,0,0.07)" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
              <div>
                <img src="/assets/images/logo.png" alt="Logo" style={{ height: 56, marginBottom: 14, display: "block" }} />
                {inv.sellerAddress && <p style={{ margin: 0, fontSize: 12, color: bwc("#6b7280"), lineHeight: 1.7, maxWidth: 280 }}>{inv.sellerAddress}</p>}
                {inv.sellerGst && <p style={{ margin: "6px 0 0", fontSize: 12, color: bwc("#374151") }}>GSTIN: <strong>{inv.sellerGst}</strong></p>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "inline-block", background: isHighValue ? "transparent" : "#111", color: isHighValue ? "#000" : "#fff", border: isHighValue ? "1.5px solid #000" : "none", padding: "4px 18px", borderRadius: radius(6), fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", marginBottom: 12 }}>TAX INVOICE</div>
                <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900, letterSpacing: "-0.5px", color: "#111" }}>{inv.invoiceNumber}</p>
                <p style={{ margin: "0 0 3px", fontSize: 12, color: bwc("#6b7280") }}>
                  Date: <strong style={{ color: "#111" }}>{new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</strong>
                </p>
                {inv.orderNumber && <p style={{ margin: "0 0 10px", fontSize: 12, color: bwc("#6b7280") }}>Order Ref: <strong style={{ color: "#111" }}>#{inv.orderNumber}</strong></p>}
                <span style={{ background: isHighValue ? "transparent" : sc.bg, color: isHighValue ? "#000" : sc.color, border: isHighValue ? "1.5px solid #000" : "none", borderRadius: radius(6), padding: "4px 14px", fontSize: 11, fontWeight: 700 }}>{inv.status}</span>
              </div>
            </div>

            <div style={{ height: 1, background: bwc("#f0f0f0"), marginBottom: 24 }} />

            {/* Bill To + Ship To + Payment */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20, marginBottom: 28 }}>
              {/* Bill To */}
              <div>
                <p style={secLbl(isHighValue)}>Bill To</p>
                <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 14 }}>{inv.partnerName}</p>
                {inv.partnerAddress?.companyName && <p style={infoTxt(isHighValue)}>{inv.partnerAddress.companyName}</p>}
                {inv.partnerAddress?.street && <p style={infoTxt(isHighValue)}>{inv.partnerAddress.street}</p>}
                {[inv.partnerAddress?.city, inv.partnerAddress?.state, inv.partnerAddress?.zip].filter(Boolean).length > 0 && (
                  <p style={infoTxt(isHighValue)}>{[inv.partnerAddress.city, inv.partnerAddress.state, inv.partnerAddress.zip].filter(Boolean).join(", ")}</p>
                )}
                {inv.partnerAddress?.gst && <p style={{ ...infoTxt(isHighValue), fontWeight: 600, color: bwc("#374151") }}>GSTIN: {inv.partnerAddress.gst}</p>}
                {inv.partnerAddress?.phone && <p style={infoTxt(isHighValue)}>📞 {inv.partnerAddress.phone}</p>}
                {inv.partnerAddress?.email && <p style={infoTxt(isHighValue)}>✉ {inv.partnerAddress.email}</p>}
              </div>

              {/* Ship To */}
              <div>
                <p style={secLbl(isHighValue)}>Ship To (Consignee)</p>
                {(() => {
                  const s = inv.shipToAddress || inv.partnerAddress;
                  return <>
                    <p style={{ margin: "0 0 3px", fontWeight: 700, fontSize: 14 }}>{s?.name || inv.partnerName}</p>
                    {s?.companyName && <p style={infoTxt(isHighValue)}>{s.companyName}</p>}
                    {s?.street && <p style={infoTxt(isHighValue)}>{s.street}</p>}
                    {[s?.city, s?.state, s?.zip].filter(Boolean).length > 0 && (
                      <p style={infoTxt(isHighValue)}>{[s.city, s.state, s.zip].filter(Boolean).join(", ")}</p>
                    )}
                    {s?.gst && <p style={{ ...infoTxt(isHighValue), fontWeight: 600, color: bwc("#374151") }}>GSTIN: {s.gst}</p>}
                    {s?.phone && <p style={infoTxt(isHighValue)}>📞 {s.phone}</p>}
                  </>;
                })()}
              </div>

              {/* Invoice Type / GST */}
              <div>
                <p style={secLbl(isHighValue)}>Invoice Type</p>
                <div style={{ marginBottom: 8 }}>
                  <span style={{
                    background: isHighValue ? "transparent" : (inv.partnerType === "B2B" ? "#ede9fe" : "#f3f4f6"),
                    color: isHighValue ? "#000" : (inv.partnerType === "B2B" ? "#5b21b6" : "#374151"),
                    border: isHighValue ? "1.5px solid #000" : "none",
                    borderRadius: radius(6), padding: "4px 12px", fontSize: 13, fontWeight: 700 }}>
                    {inv.partnerType || "B2B"}
                  </span>
                </div>
                <p style={infoTxt(isHighValue)}>GST Type: <strong>{inv.gstType || "INTRA"}</strong></p>
                {inv.gstType === "NONE" && <p style={infoTxt(isHighValue)}>No GST applicable</p>}
                {inv.gstType !== "NONE" && distinctRates.length > 1 && (
                  <p style={infoTxt(isHighValue)}>Mixed rates: {distinctRates.sort((a, b) => a - b).map(r => `${r}%`).join(", ")} (product-wise)</p>
                )}
                {inv.gstType === "INTRA" && distinctRates.length <= 1 && <p style={infoTxt(isHighValue)}>CGST {(distinctRates[0] || 0) / 2}% + SGST {(distinctRates[0] || 0) / 2}%</p>}
                {inv.gstType === "INTER" && distinctRates.length <= 1 && <p style={infoTxt(isHighValue)}>IGST {distinctRates[0] || 0}%</p>}
              </div>

              {/* Payment — restricted to admin/accounts */}
              {canViewPayments && (
              <div>
                <p style={secLbl(isHighValue)}>Payment</p>
                <p style={infoTxt(isHighValue)}>Method: <strong>{inv.paymentSnapshot?.paymentMethod || "—"}</strong></p>
                <p style={infoTxt(isHighValue)}>Status: <strong>{inv.paymentSnapshot?.paymentStatus || "—"}</strong></p>
                <p style={infoTxt(isHighValue)}>Txn ID: <span style={{ fontFamily: "monospace", fontSize: 12 }}>{inv.paymentSnapshot?.transactionId || "—"}</span></p>
                {inv.sentAt && <p style={infoTxt(isHighValue)}>Sent: {new Date(inv.sentAt).toLocaleDateString("en-IN")}</p>}
              </div>
              )}
            </div>

            <div style={{ height: 1, background: bwc("#f0f0f0"), marginBottom: 24 }} />

            {/* Items table */}
            <div style={{ border: isHighValue ? "1px solid #000" : "1px solid #f0f0f0", borderRadius: radius(10), overflow: "hidden", marginBottom: 24 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: isHighValue ? "#fff" : "#111", color: isHighValue ? "#000" : "#fff", borderBottom: isHighValue ? "1.5px solid #000" : "none" }}>
                    {["#", "Description", "HSN/SAC", "Qty", "Rate", "Taxable Amt", "GST %",
                      ...(inv.gstType === "INTRA" ? ["CGST", "SGST"] : inv.gstType === "INTER" ? ["IGST"] : []),
                      "Amount"
                    ].map(h => (
                      <th key={h} style={{ padding: "11px 14px", textAlign: h === "#" ? "center" : "left", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itemsWithGst.map((item, i) => {
                    const taxable = item.taxableAmount || (item.qty * item.rate);
                    const rate    = Number(item.gstPercent || 0);
                    const cgst    = inv.gstType === "INTRA" ? (taxable * rate) / 200 : 0;
                    const sgst    = inv.gstType === "INTRA" ? (taxable * rate) / 200 : 0;
                    const igst    = inv.gstType === "INTER" ? (taxable * rate) / 100 : 0;
                    const total   = taxable + cgst + sgst + igst;
                    return (
                      <tr key={i} style={{ borderBottom: isHighValue ? "1px solid #000" : "1px solid #f5f5f5", background: isHighValue ? "#fff" : (i % 2 === 0 ? "#fff" : "#fafafa") }}>
                        <td style={{ padding: "11px 14px", textAlign: "center", color: bwc("#9ca3af") }}>{i + 1}</td>
                        <td style={{ padding: "11px 14px", fontWeight: 500 }}>{item.description}</td>
                        <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12, color: bwc("#6b7280") }}>{item.hsnCode || "—"}</td>
                        <td style={{ padding: "11px 14px" }}>{item.qty}</td>
                        <td style={{ padding: "11px 14px" }}>{fmt(item.rate)}</td>
                        <td style={{ padding: "11px 14px" }}>{fmt(taxable)}</td>
                        <td style={{ padding: "11px 14px" }}>{rate}%</td>
                        {inv.gstType === "INTRA" && <>
                          <td style={{ padding: "11px 14px" }}>{fmt(cgst)}</td>
                          <td style={{ padding: "11px 14px" }}>{fmt(sgst)}</td>
                        </>}
                        {inv.gstType === "INTER" && <td style={{ padding: "11px 14px" }}>{fmt(igst)}</td>}
                        <td style={{ padding: "11px 14px", fontWeight: 700 }}>{fmt(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ minWidth: 320, background: bwBg("#fafafa"), borderRadius: radius(10), border: isHighValue ? "1px solid #000" : "1px solid #f0f0f0", padding: "16px 20px" }}>
                {[
                  { label: "Taxable Value", value: fmt(inv.taxableValue || inv.subTotal) },
                  ...gstRows.filter(g => g.rate > 0).flatMap(g =>
                    inv.gstType === "INTRA" ? [
                      { label: `CGST @ ${g.cgstPercent}%`, value: fmt(g.cgst) },
                      { label: `SGST @ ${g.sgstPercent}%`, value: fmt(g.sgst) },
                    ] : inv.gstType === "INTER" ? [
                      { label: `IGST @ ${g.igstPercent}%`, value: fmt(g.igst) },
                    ] : []
                  ),
                  { label: "Total Tax", value: fmt(inv.gstAmount) },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: isHighValue ? "1px solid #000" : "1px solid #f0f0f0" }}>
                    <span style={{ fontSize: 13, color: bwc("#6b7280") }}>{r.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>{r.value}</span>
                  </div>
                ))}
                {/* Coupon — after GST, before grand total.
                    Use saved couponDiscount if available; otherwise infer from totals
                    (handles invoices created before the coupon-save fix). */}
                {(() => {
                  const saved    = Number(inv.couponDiscount || 0);
                  const inferred = Math.round(((inv.subTotal || 0) + (inv.gstAmount || 0) - (inv.grandTotal || 0)) * 100) / 100;
                  const discount = saved > 0 ? saved : (inferred > 0.001 ? inferred : 0);
                  if (!discount) return null;
                  return (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: isHighValue ? "1px solid #000" : "1px solid #f0f0f0" }}>
                      <span style={{ fontSize: 13, color: bwc("#16a34a"), fontWeight: 600 }}>
                        Coupon Discount {inv.couponCode ? `(${inv.couponCode})` : ""}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: bwc("#16a34a") }}>− {fmt(discount)}</span>
                    </div>
                  );
                })()}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 0", marginTop: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#111" }}>Grand Total</span>
                  <span style={{ fontSize: 24, fontWeight: 900, color: "#111", letterSpacing: "-0.5px" }}>{fmt(inv.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Remarks + Declaration */}
            <div style={{ height: 1, background: bwc("#f0f0f0"), margin: "28px 0 20px" }} />
            <div style={{ display: "grid", gridTemplateColumns: inv.remarks ? "1fr 1fr" : "1fr", gap: 24 }}>
              {inv.remarks && (
                <div style={{ background: isHighValue ? "#fff" : "#fffbeb", border: isHighValue ? "1px solid #000" : "1px solid #fde68a", borderRadius: radius(8), padding: "14px 16px" }}>
                  <p style={secLbl(isHighValue)}>Remarks</p>
                  <p style={{ margin: 0, fontSize: 13, color: bwc("#374151"), lineHeight: 1.6 }}>{inv.remarks}</p>
                </div>
              )}
              <div style={{ background: isHighValue ? "#fff" : "#f9fafb", border: isHighValue ? "1px solid #000" : "1px solid #f0f0f0", borderRadius: radius(8), padding: "14px 16px" }}>
                <p style={secLbl(isHighValue)}>Declaration</p>
                <p style={{ margin: 0, fontSize: 12, color: bwc("#6b7280"), lineHeight: 1.8, whiteSpace: "pre-line" }}>
                  {inv.declaration || "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nGoods Once Sold Will Not be Taken back. All disputes are subject to Lucknow's Jurisdiction."}
                </p>
              </div>
            </div>

            {/* Footer: signatory only — no bank details */}
            <div style={{ height: 1, background: bwc("#f0f0f0"), margin: "28px 0 20px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <p style={{ margin: 0, fontSize: 12, color: bwc("#9ca3af") }}>This is a computer-generated invoice.</p>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: "0 0 36px", fontSize: 12, color: bwc("#6b7280") }}>For: One Prime Studios</p>
                <div style={{ borderTop: isHighValue ? "1.5px solid #000" : "1.5px solid #374151", paddingTop: 6, display: "inline-block", minWidth: 180 }}>
                  <p style={{ margin: 0, fontSize: 12, color: bwc("#374151"), fontWeight: 700 }}>Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const secLbl = (bw) => ({ margin: "0 0 8px", fontSize: 10, fontWeight: 700, color: bw ? "#000" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" });
const infoTxt = (bw) => ({ margin: "0 0 3px", fontSize: 13, color: bw ? "#000" : "#6b7280", lineHeight: 1.6 });