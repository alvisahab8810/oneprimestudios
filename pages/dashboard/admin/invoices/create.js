"use client";

import React, { useState } from "react";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import toast from "react-hot-toast";
import Link from "next/link";
import { computeGstBreakdown } from "@/utils/gstBreakdown";

// ── One Prime Studios constants (never manual) ────────────────────────────────
const OPS = {
  name:    "One Prime Studios",
  address: "591/eya/19 kumhar mandi, Kharika telibagh Lucknow",
  phone:   "8081815141",
  email:   "admin@oneprimestudios.com",
  gstin:   "09CORPG5317P1Z6",
  state:   "09-Uttar Pradesh",
  bank: {
    name:          "UCO BANK, VRINDAVAN YOJNA",
    accountNo:     "31350210001073",
    ifsc:          "UCBA0003135",
    accountHolder: "ONE PRIME STUDIOS",
  },
};

// ── Detect GST type: pincode takes priority over state ────────────────────────
// UP pincodes: 200001–285999. If valid 6-digit pincode is given, use it first.
const detectGstType = (state = "", pincode = "") => {
  const pin = Number(pincode);
  const validPin = String(pincode).trim().length === 6 && !isNaN(pin);
  if (validPin) {
    return (pin >= 200001 && pin <= 285999) ? "INTRA" : "INTER";
  }
  // No valid pincode — fall back to state name
  const upStates = ["uttar pradesh", "up"];
  if (upStates.includes(state.toLowerCase().trim())) return "INTRA";
  if (state) return "INTER";
  return "INTRA"; // default when neither pincode nor state provided
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function CreateInvoiceAdmin() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Multi-order inputs ──────────────────────────────────────────────────────
  const [orderInputs, setOrderInputs] = useState([{ id: "", preview: null, loading: false }]);

  // ── Manual Invoice meta ─────────────────────────────────────────────────────
  const [manualInvoiceNo, setManualInvoiceNo] = useState("");
  const [invoiceDate,     setInvoiceDate]     = useState(todayISO());

  // ── Invoice settings ────────────────────────────────────────────────────────
  const [gstType,     setGstType]     = useState("INTRA");
  const [partnerType, setPartnerType] = useState("B2B");
  const [remarks,     setRemarks]     = useState("");
  const [declaration, setDeclaration] = useState("We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nGoods Once Sold Will Not be Taken back. All disputes are subject to Lucknow's Jurisdiction.");
  const [loading,     setLoading]     = useState(false);

  // ── Bill To (auto-filled, editable) ────────────────────────────────────────
  const [billTo, setBillTo] = useState({
    name: "", companyName: "", gst: "", phone: "", email: "",
    street: "", city: "", state: "", zip: "",
  });

  // ── Ship To / Consignee (auto-filled from Bill To, editable) ───────────────
  const [shipSameAsBill, setShipSameAsBill] = useState(true);
  const [shipTo, setShipTo] = useState({
    name: "", companyName: "", gst: "", phone: "", email: "",
    street: "", city: "", state: "", zip: "",
  });

  // ── Invoice items ────────────────────────────────────────────────────────────
  // Each item carries its own GST % (auto-filled from the product's GST rate).
  const [items, setItems] = useState([{ description: "", hsnCode: "", qty: 1, rate: 0, amount: 0, gstPercent: 0 }]);

  // ── Coupon (auto-fetched from order) ─────────────────────────────────────────
  const [coupon, setCoupon] = useState(null); // { code, discountAmount }

  // ── Fetch order preview ─────────────────────────────────────────────────────
  const fetchOrderPreview = async (index) => {
    const orderId = orderInputs[index].id.trim();
    if (!orderId) return;

    setOrderInputs((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], loading: true, preview: null };
      return u;
    });

    try {
      const res = await axios.get(`/api/admin/orders/preview?orderId=${encodeURIComponent(orderId)}`);
      const data = res.data;

      setOrderInputs((prev) => {
        const u = [...prev];
        u[index] = { ...u[index], loading: false, preview: data };
        return u;
      });

      // Auto-fill from first successful order
      if (index === 0 || !orderInputs.some((o) => o.preview)) {
        // GST Type auto-detect (each item brings its own GST % from the product)
        if (data.autoGstType) setGstType(data.autoGstType);

        // Partner type
        setPartnerType(data.partnerGst ? "B2B" : "B2C");

        // Bill To
        const addr = data.partnerAddress || {};
        const filled = {
          name:        data.partnerName || "",
          companyName: addr.companyName || data.partnerCompanyName || "",
          gst:         addr.gst || data.partnerGst || "",
          phone:       addr.phone || "",
          email:       addr.email || "",
          street:      addr.street || "",
          city:        addr.city || "",
          state:       addr.state || "",
          zip:         addr.zip || "",
        };
        setBillTo(filled);
        if (shipSameAsBill) setShipTo(filled);

        // Coupon discount
        setCoupon(data.coupon || null);
      }

      // Append items
      if (data.items && data.items.length > 0) {
        setItems((prev) => {
          const existingNonEmpty = prev.filter((it) => it.description.trim() || it.rate > 0);
          return [...existingNonEmpty, ...data.items];
        });
      }
    } catch (err) {
      setOrderInputs((prev) => {
        const u = [...prev];
        u[index] = { ...u[index], loading: false, preview: null };
        return u;
      });
      toast.error(err.response?.data?.message || `Order not found: ${orderId}`);
    }
  };

  const addOrderInput = () =>
    setOrderInputs((prev) => [...prev, { id: "", preview: null, loading: false }]);

  const removeOrderInput = (index) =>
    setOrderInputs((prev) => prev.filter((_, i) => i !== index));

  // ── Item helpers ────────────────────────────────────────────────────────────
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === "qty" || field === "rate") {
      updated[index].amount = Number(updated[index].qty) * Number(updated[index].rate);
    }
    setItems(updated);
  };

  const addItemRow = () =>
    setItems([...items, { description: "", hsnCode: "", qty: 1, rate: 0, amount: 0, gstPercent: 0 }]);

  const removeItemRow = (index) =>
    setItems(items.filter((_, i) => i !== index));

  // ── Create invoice ──────────────────────────────────────────────────────────
  const handleCreateInvoice = async () => {
    const validPreviews = orderInputs.filter((o) => o.preview);
    if (validPreviews.length === 0) return toast.error("Load at least one order first");
    if (items.length === 0) return toast.error("At least one item is required");

    try {
      setLoading(true);
      const primaryPreview = validPreviews[0].preview;
      const allOrderNumbers = validPreviews.map((o) => o.preview.orderNumber.replace(/^#/, ""));

      await axios.post("/api/admin/invoices/create", {
        orderId:          primaryPreview.orderId,
        orderNumbers:     allOrderNumbers,
        items,
        gstType,
        partnerType,
        remarks,
        declaration,
        invoiceNumber:    manualInvoiceNo.trim() || undefined,
        invoiceDate:      invoiceDate || undefined,
        shipToAddress:    shipSameAsBill ? billTo : shipTo,
        billToAddress:    billTo,
        coupon:           coupon || null,
      });

      toast.success("Invoice created successfully");

      // Reset
      setOrderInputs([{ id: "", preview: null, loading: false }]);
      setGstType("INTRA"); setPartnerType("B2B");
      setRemarks(""); setDeclaration("We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nGoods Once Sold Will Not be Taken back. All disputes are subject to Lucknow's Jurisdiction."); setManualInvoiceNo(""); setInvoiceDate(todayISO());
      setItems([{ description: "", hsnCode: "", qty: 1, rate: 0, amount: 0, gstPercent: 0 }]);
      setBillTo({ name:"",companyName:"",gst:"",phone:"",email:"",street:"",city:"",state:"",zip:"" });
      setShipTo({ name:"",companyName:"",gst:"",phone:"",email:"",street:"",city:"",state:"",zip:"" });
      setCoupon(null);
    } catch (err) {
      console.error("create invoice:", err);
      toast.error(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  // ── Computed totals ─────────────────────────────────────────────────────────
  // Each item carries its own GST % (from the product), so items are grouped
  // by rate and CGST/SGST/IGST computed per slab, then summed.
  // Coupon discount reduces the final grand total directly.
  const subTotal       = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const couponDiscount = coupon?.discountAmount || 0;
  const { rows: gstRows, totals: gstTotals } = gstType !== "NONE"
    ? computeGstBreakdown(items, gstType)
    : { rows: [], totals: { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 } };
  const gstAmount  = gstTotals.tax;
  const grandTotal = subTotal + gstAmount - couponDiscount;

  const inputCls = "form-control form-control-sm";
  const labelCls = "form-label mb-1 small fw-semibold text-secondary";

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="container-fluid p-4">

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h1 className="dashboard-main-h">Create Invoice</h1>
            <Link href="/dashboard/admin/invoices" className="btn btn-outline-secondary btn-sm">
              ← Back to Invoices
            </Link>
          </div>

          {/* ── OPS Company Details (read-only) ── */}
          <div className="card p-3 mb-4 border-0" style={{ background: "#f8f9ff" }}>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h5 className="fw-bold mb-1" style={{ color: "#1e3a8a" }}>{OPS.name}</h5>
                <div className="small text-muted">
                  {OPS.address}<br />
                  📞 {OPS.phone} &nbsp;|&nbsp; ✉ {OPS.email}<br />
                  <strong>GSTIN:</strong> {OPS.gstin} &nbsp;|&nbsp; <strong>State:</strong> {OPS.state}
                </div>
              </div>
            </div>
          </div>

          {/* ── Invoice No. + Date (manual) ── */}
          <div className="card p-3 mb-4">
            <h5 className="mb-3">Invoice Details</h5>
            <div className="row g-3">
              <div className="col-md-4">
                <label className={labelCls}>Invoice No. <span className="text-muted fw-normal">(leave blank to auto-generate)</span></label>
                <input className={inputCls} placeholder="e.g. OPS/2025-26/333"
                  value={manualInvoiceNo} onChange={(e) => setManualInvoiceNo(e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className={labelCls}>Invoice Date</label>
                <input type="date" className={inputCls}
                  value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── Order References ── */}
          <div className="card p-3 mb-4">
            <h5 className="mb-3">Order Reference(s)</h5>
            {orderInputs.map((input, index) => (
              <div key={index} className="row g-2 align-items-center mb-2">
                <div className="col-md-5">
                  <input className={inputCls} placeholder="Order Number (e.g. ORD-20260403-1234)"
                    value={input.id}
                    onChange={(e) => {
                      const u = [...orderInputs];
                      u[index] = { ...u[index], id: e.target.value, preview: null };
                      setOrderInputs(u);
                    }}
                  />
                </div>
                <div className="col-md-2">
                  <button className="btn btn-outline-primary btn-sm w-100"
                    onClick={() => fetchOrderPreview(index)} disabled={input.loading}>
                    {input.loading ? "Loading..." : "Load Order"}
                  </button>
                </div>
                {orderInputs.length > 1 && (
                  <div className="col-md-1">
                    <button className="btn btn-outline-danger btn-sm" onClick={() => removeOrderInput(index)}>✕</button>
                  </div>
                )}
                {input.preview && (
                  <div className="col-12">
                    <div className="alert alert-success py-2 mb-0 small">
                      <strong>{input.preview.orderNumber}</strong> — {input.preview.partnerName} | ₹{input.preview.orderAmount} | {input.preview.paymentStatus}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button className="btn btn-outline-secondary btn-sm mt-1" onClick={addOrderInput}>
              + Add Another Order
            </button>
          </div>

          {/* ── Bill To + Ship To ── */}
          <div className="card p-3 mb-4">
            <h5 className="mb-3">Consignee / Bill To / Ship To</h5>
            <div className="row g-3">
              {/* Bill To */}
              <div className="col-md-6">
                <h6 className="fw-semibold mb-2" style={{ color: "#374151" }}>Bill To</h6>
                <div className="alert alert-warning py-2 px-3 mb-2 small">
                  ⚠️ City, State & Pincode may be empty if not saved in partner profile. Please fill them manually if needed.
                </div>
                {[
                  ["name", "Name"],
                  ["companyName", "Company Name"],
                  ["gst", "GSTIN"],
                  ["phone", "Phone"],
                  ["email", "Email"],
                  ["street", "Address"],
                  ["city", "City"],
                  ["state", "State"],
                  ["zip", "Pincode"],
                ].map(([field, label]) => (
                  <div className="mb-2" key={field}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputCls} value={billTo[field]}
                      onChange={(e) => {
                        const updated = { ...billTo, [field]: e.target.value };
                        setBillTo(updated);
                        if (shipSameAsBill) {
                          setShipTo(updated);
                          // Re-detect GST type if state changes
                          if (field === "state" || field === "zip") {
                            setGstType(detectGstType(updated.state, updated.zip));
                          }
                        }
                        if (field === "state" || field === "zip") {
                          setGstType(detectGstType(
                            field === "state" ? e.target.value : billTo.state,
                            field === "zip"   ? e.target.value : billTo.zip
                          ));
                        }
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Ship To */}
              <div className="col-md-6">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-semibold mb-0" style={{ color: "#374151" }}>Ship To (Consignee)</h6>
                  <div className="form-check form-switch mb-0">
                    <input className="form-check-input" type="checkbox" id="shipSame"
                      checked={shipSameAsBill}
                      onChange={(e) => {
                        setShipSameAsBill(e.target.checked);
                        if (e.target.checked) setShipTo({ ...billTo });
                      }} />
                    <label className="form-check-label small" htmlFor="shipSame">Same as Bill To</label>
                  </div>
                </div>
                {[
                  ["name", "Name"],
                  ["companyName", "Company Name"],
                  ["gst", "GSTIN"],
                  ["phone", "Phone"],
                  ["email", "Email"],
                  ["street", "Address"],
                  ["city", "City"],
                  ["state", "State"],
                  ["zip", "Pincode"],
                ].map(([field, label]) => (
                  <div className="mb-2" key={field}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputCls} value={shipTo[field]}
                      disabled={shipSameAsBill}
                      onChange={(e) => setShipTo((prev) => ({ ...prev, [field]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── GST Settings ── */}
          <div className="card p-3 mb-4">
            <h5 className="mb-3">Tax Settings</h5>
            <div className="small text-muted mb-2">
              GST % is set per item below (auto-filled from each product's own GST rate).
            </div>
            <div className="row g-3">
              <div className="col-md-3">
                <label className={labelCls}>GST Type (auto-detected from pincode)</label>
                <select className="form-select form-select-sm" value={gstType}
                  onChange={(e) => setGstType(e.target.value)}>
                  <option value="INTRA">INTRA — CGST + SGST (Within UP)</option>
                  <option value="INTER">INTER — IGST (Outside UP)</option>
                  <option value="NONE">NONE (Exempt / Unregistered)</option>
                </select>
                <div className="small text-muted mt-1">
                  {gstType === "INTRA" && "✅ Within Uttar Pradesh"}
                  {gstType === "INTER" && "🔄 Outside Uttar Pradesh"}
                </div>
              </div>
              <div className="col-md-3">
                <label className={labelCls}>Partner Type</label>
                <select className="form-select form-select-sm" value={partnerType}
                  onChange={(e) => setPartnerType(e.target.value)}>
                  <option value="B2B">B2B (has GSTIN)</option>
                  <option value="B2C">B2C (individual)</option>
                  <option value="UNREGISTERED">Unregistered</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Invoice Items ── */}
          <div className="card p-3 mb-4">
            <h5 className="mb-3">Invoice Items</h5>
            {items.map((item, index) => (
              <div className="row g-2 align-items-end mb-2" key={index}>
                <div className="col-md-2">
                  <label className={labelCls}>Description</label>
                  <input className={inputCls} value={item.description}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)} />
                </div>
                <div className="col-md-2">
                  <label className={labelCls}>HSN / SAC</label>
                  <input className={inputCls} value={item.hsnCode || ""}
                    onChange={(e) => handleItemChange(index, "hsnCode", e.target.value)}
                    placeholder="e.g. 4911" />
                </div>
                <div className="col-md-1">
                  <label className={labelCls}>Qty</label>
                  <input type="number" className={inputCls} value={item.qty}
                    onChange={(e) => handleItemChange(index, "qty", e.target.value)} />
                </div>
                <div className="col-md-2">
                  <label className={labelCls}>Rate (₹)</label>
                  <input type="number" className={inputCls} value={item.rate}
                    onChange={(e) => handleItemChange(index, "rate", e.target.value)} />
                </div>
                <div className="col-md-1">
                  <label className={labelCls}>GST %</label>
                  <select className="form-select form-select-sm" value={item.gstPercent || 0}
                    onChange={(e) => handleItemChange(index, "gstPercent", Number(e.target.value))}>
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className={labelCls}>Amount (₹)</label>
                  <input className={inputCls} value={Number(item.amount).toFixed(2)} disabled />
                </div>
                <div className="col-md-1">
                  <button className="btn btn-outline-danger btn-sm w-100"
                    onClick={() => removeItemRow(index)} disabled={items.length === 1}>✕</button>
                </div>
              </div>
            ))}
            <button className="btn btn-outline-primary btn-sm mt-2" onClick={addItemRow}>+ Add Item</button>

            {/* Totals */}
            <div className="mt-4 ms-auto" style={{ maxWidth: 340 }}>
              <div className="d-flex justify-content-between mb-1">
                <span>Sub Total (Taxable)</span>
                <strong>₹{subTotal.toFixed(2)}</strong>
              </div>
              {gstType !== "NONE" && gstRows.filter((r) => r.rate > 0).map((r) => (
                <React.Fragment key={r.rate}>
                  {gstType === "INTRA" && (
                    <>
                      <div className="d-flex justify-content-between mb-1 text-muted small">
                        <span>CGST @ {r.cgstPercent}%</span>
                        <span>₹{r.cgst.toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1 text-muted small">
                        <span>SGST @ {r.sgstPercent}%</span>
                        <span>₹{r.sgst.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {gstType === "INTER" && (
                    <div className="d-flex justify-content-between mb-1 text-muted small">
                      <span>IGST @ {r.igstPercent}%</span>
                      <span>₹{r.igst.toFixed(2)}</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
              {coupon && couponDiscount > 0 && (
                <div className="d-flex justify-content-between mb-1 text-success small fw-semibold">
                  <span>Coupon Discount ({coupon.code})</span>
                  <span>− ₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <hr className="my-1" />
              <div className="d-flex justify-content-between fw-bold fs-6">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ── Remarks + Declaration (editable) ── */}
          <div className="card p-3 mb-4">
            <div className="row g-3">
              <div className="col-md-6">
                <label className={labelCls}>Remarks (optional — printed on invoice)</label>
                <textarea className="form-control form-control-sm" rows="3" value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Special instructions, payment terms..." />
              </div>
              <div className="col-md-6">
                <label className={labelCls}>Declaration (editable — printed on invoice)</label>
                <textarea className="form-control form-control-sm" rows="3" value={declaration}
                  onChange={(e) => setDeclaration(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="mb-5">
            <button className="btn btn-success me-2" onClick={handleCreateInvoice} disabled={loading}>
              {loading ? "Creating..." : "Create Invoice"}
            </button>
            <button className="btn btn-outline-secondary" onClick={() => {
              setOrderInputs([{ id: "", preview: null, loading: false }]);
              setGstPercent(0); setGstType("INTRA"); setPartnerType("B2B");
              setRemarks(""); setDeclaration("We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nGoods Once Sold Will Not be Taken back. All disputes are subject to Lucknow's Jurisdiction."); setManualInvoiceNo(""); setInvoiceDate(todayISO());
              setItems([{ description: "", hsnCode: "", qty: 1, rate: 0, amount: 0 }]);
              setBillTo({ name:"",companyName:"",gst:"",phone:"",email:"",street:"",city:"",state:"",zip:"" });
              setShipTo({ name:"",companyName:"",gst:"",phone:"",email:"",street:"",city:"",state:"",zip:"" });
              setCoupon(null);
            }}>Reset</button>
          </div>

        </div>
      </div>
    </div>
  );
}
