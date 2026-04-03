"use client";

import React, { useState } from "react";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CreateInvoiceAdmin() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Multi-order inputs ──────────────────────────────────────────────────────
  const [orderInputs, setOrderInputs] = useState([{ id: "", preview: null, loading: false }]);

  // ── Invoice meta ────────────────────────────────────────────────────────────
  const [gstPercent, setGstPercent]       = useState(0);
  const [gstType, setGstType]             = useState("INTRA");
  const [partnerType, setPartnerType]     = useState("B2B");
  const [sellerGst, setSellerGst]         = useState("");
  const [sellerAddress, setSellerAddress] = useState("");
  const [remarks, setRemarks]             = useState("");
  const [loading, setLoading]             = useState(false);

  // ── Invoice items (editable) ────────────────────────────────────────────────
  // OLD: { description, qty, rate, amount }
  // NEW: added hsnCode field — auto-filled from product when order is loaded
  const [items, setItems] = useState([{ description: "", hsnCode: "", qty: 1, rate: 0, amount: 0 }]);

  // ── Fetch single order preview ──────────────────────────────────────────────
  const fetchOrderPreview = async (index) => {
    const orderId = orderInputs[index].id.trim();
    if (!orderId) return;

    setOrderInputs((prev) => {
      const u = [...prev];
      u[index] = { ...u[index], loading: true, preview: null };
      return u;
    });

    try {
      const res = await axios.get(
        `/api/admin/orders/preview?orderId=${encodeURIComponent(orderId)}`
      );
      const data = res.data;

      setOrderInputs((prev) => {
        const u = [...prev];
        u[index] = { ...u[index], loading: false, preview: data };
        return u;
      });

      // Auto-fill partner info from first successful preview
      if (index === 0 || !orderInputs.some((o) => o.preview)) {
        if (data.productGstPercent !== undefined) {
          setGstPercent(data.productGstPercent);
        }
      }

      // Combine items from this order into the items table
      if (data.items && data.items.length > 0) {
        setItems((prev) => {
          // Remove placeholder empty row if this is the first real data
          const existingNonEmpty = prev.filter(
            (it) => it.description.trim() || it.rate > 0
          );
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

  const removeOrderInput = (index) => {
    setOrderInputs((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Item helpers ────────────────────────────────────────────────────────────
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === "qty" || field === "rate") {
      updated[index].amount =
        Number(updated[index].qty) * Number(updated[index].rate);
    }
    setItems(updated);
  };

  const addItemRow = () =>
    setItems([...items, { description: "", hsnCode: "", qty: 1, rate: 0, amount: 0 }]);

  const removeItemRow = (index) =>
    setItems(items.filter((_, i) => i !== index));

  // ── Create invoice ──────────────────────────────────────────────────────────
  const handleCreateInvoice = async () => {
    const validPreviews = orderInputs.filter((o) => o.preview);
    if (validPreviews.length === 0) {
      return toast.error("Load at least one order first");
    }
    if (items.length === 0) {
      return toast.error("At least one item is required");
    }

    try {
      setLoading(true);

      const primaryPreview = validPreviews[0].preview;
      const allOrderNumbers = validPreviews.map((o) => o.preview.orderNumber.replace(/^#/, ""));

      await axios.post("/api/admin/invoices/create", {
        orderId: primaryPreview.orderId,
        orderNumbers: allOrderNumbers,
        items,
        gstPercent,
        gstType,
        partnerType,
        sellerGst,
        sellerAddress,
        remarks,
      });

      toast.success("Invoice created successfully (DRAFT)");

      // Reset
      setOrderInputs([{ id: "", preview: null, loading: false }]);
      setGstPercent(0);
      setGstType("INTRA");
      setPartnerType("B2B");
      setSellerGst("");
      setSellerAddress("");
      setRemarks("");
      setItems([{ description: "", hsnCode: "", qty: 1, rate: 0, amount: 0 }]);
    } catch (err) {
      console.error("create invoice:", err);
      toast.error(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  // ── Computed totals ─────────────────────────────────────────────────────────
  const subTotal   = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  let gstAmount    = 0;
  if (gstType === "INTRA") gstAmount = subTotal * gstPercent / 100;
  if (gstType === "INTER") gstAmount = subTotal * gstPercent / 100;
  const grandTotal = subTotal + gstAmount;

  const primaryPreview = orderInputs.find((o) => o.preview)?.preview;

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="container-fluid p-4">

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h1 className="dashboard-main-h">Create Invoice</h1>
            <Link href="/dashboard/admin/invoices" className="btn btn-outline-secondary">
              Back to Invoices
            </Link>
          </div>

          <div className="card p-3 mb-4">
            <h5 className="mb-3">Order References</h5>

            {orderInputs.map((input, index) => (
              <div key={index} className="row g-2 align-items-center mb-2">
                <div className="col-md-5">
                  <input
                    className="form-control"
                    placeholder={`Order Number (e.g. OPS-2025-001)`}
                    value={input.id}
                    onChange={(e) => {
                      const u = [...orderInputs];
                      u[index] = { ...u[index], id: e.target.value, preview: null };
                      setOrderInputs(u);
                    }}
                    onBlur={() => fetchOrderPreview(index)}
                  />
                </div>
                <div className="col-md-2">
                  <button
                    className="btn btn-outline-primary w-100"
                    onClick={() => fetchOrderPreview(index)}
                    disabled={input.loading}
                  >
                    {input.loading ? "Loading..." : "Load"}
                  </button>
                </div>
                {orderInputs.length > 1 && (
                  <div className="col-md-1">
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => removeOrderInput(index)}
                    >
                      ✕
                    </button>
                  </div>
                )}
                {input.preview && (
                  <div className="col-12">
                    <div className="alert alert-success py-2 mb-0 small">
                      <strong>{input.preview.orderNumber}</strong> —{" "}
                      {input.preview.partnerName} |{" "}
                      ₹{input.preview.orderAmount} |{" "}
                      {input.preview.paymentStatus}
                      {index === 0 && (
                        <span className="badge bg-primary ms-2">Primary (partner info from here)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button className="btn btn-outline-secondary btn-sm mt-1" onClick={addOrderInput}>
              + Add Another Order
            </button>
          </div>

          {/* Partner Preview (from primary order) */}
          {primaryPreview && (
            <div className="card p-3 mb-4 bg-light">
              <h6 className="mb-2">Bill To (from primary order)</h6>
              <div className="row g-2">
                <div className="col-md-4">
                  <strong>{primaryPreview.partnerName}</strong><br />
                  <span className="text-muted" style={{ fontSize: 13 }}>
                    {primaryPreview.partnerAddress?.street}
                    {primaryPreview.partnerAddress?.city && `, ${primaryPreview.partnerAddress.city}`}
                    {primaryPreview.partnerAddress?.state && `, ${primaryPreview.partnerAddress.state}`}
                    {primaryPreview.partnerAddress?.zip && ` - ${primaryPreview.partnerAddress.zip}`}<br />
                    {primaryPreview.partnerAddress?.phone && `📞 ${primaryPreview.partnerAddress.phone}`}<br />
                    {primaryPreview.partnerAddress?.email && `📧 ${primaryPreview.partnerAddress.email}`}
                  </span>
                </div>
                <div className="col-md-4">
                  <strong>Payment:</strong><br />
                  {primaryPreview.paymentMethod} — {primaryPreview.paymentStatus}
                </div>
              </div>
            </div>
          )}

          {/* Invoice Settings */}
          <div className="card p-3 mb-4">
            <h5 className="mb-3">Invoice Settings</h5>
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">GST %</label>
                <select className="form-select" value={gstPercent} onChange={(e) => setGstPercent(Number(e.target.value))}>
                  <option value={0}>0% (None)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">GST Type</label>
                <select className="form-select" value={gstType} onChange={(e) => setGstType(e.target.value)}>
                  <option value="INTRA">INTRA (CGST + SGST)</option>
                  <option value="INTER">INTER (IGST)</option>
                  <option value="NONE">NONE</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Partner Type</label>
                <select className="form-select" value={partnerType} onChange={(e) => setPartnerType(e.target.value)}>
                  <option value="B2B">B2B (has GSTIN)</option>
                  <option value="B2C">B2C (individual)</option>
                  <option value="UNREGISTERED">Unregistered</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Seller GSTIN</label>
                <input className="form-control" value={sellerGst} onChange={(e) => setSellerGst(e.target.value)} placeholder="Your company GSTIN" />
              </div>
              <div className="col-12">
                <label className="form-label">Seller Address</label>
                <input className="form-control" value={sellerAddress} onChange={(e) => setSellerAddress(e.target.value)} placeholder="Your company address (shown on invoice header)" />
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="card p-3 mb-4">
            <h5 className="mb-3">Invoice Items</h5>

            {items.map((item, index) => (
              <div className="row g-2 align-items-end mb-2" key={index}>
                <div className="col-md-3">
                  <label className="form-label">Description</label>
                  <input className="form-control" value={item.description}
                    onChange={(e) => handleItemChange(index, "description", e.target.value)} />
                </div>
                {/* NEW: HSN/SAC code column — auto-filled from product, editable */}
                <div className="col-md-2">
                  <label className="form-label">HSN / SAC</label>
                  <input className="form-control" value={item.hsnCode || ""}
                    onChange={(e) => handleItemChange(index, "hsnCode", e.target.value)}
                    placeholder="e.g. 4911" />
                </div>
                <div className="col-md-1">
                  <label className="form-label">Qty</label>
                  <input type="number" className="form-control" value={item.qty}
                    onChange={(e) => handleItemChange(index, "qty", e.target.value)} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Rate</label>
                  <input type="number" className="form-control" value={item.rate}
                    onChange={(e) => handleItemChange(index, "rate", e.target.value)} />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Amount</label>
                  <input className="form-control" value={item.amount} disabled />
                </div>
                <div className="col-md-2">
                  <button className="btn btn-outline-danger w-100" onClick={() => removeItemRow(index)}
                    disabled={items.length === 1}>
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button className="btn btn-outline-primary mt-2" onClick={addItemRow}>+ Add Item</button>

            {/* Totals */}
            <div className="mt-4 ms-auto" style={{ maxWidth: 300 }}>
              <div className="d-flex justify-content-between mb-1">
                <span>Sub Total</span>
                <strong>₹{subTotal.toFixed(2)}</strong>
              </div>
              {gstType !== "NONE" && gstPercent > 0 && (
                <>
                  {gstType === "INTRA" && (
                    <>
                      <div className="d-flex justify-content-between mb-1 text-muted small">
                        <span>CGST ({gstPercent / 2}%)</span>
                        <span>₹{(gstAmount / 2).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1 text-muted small">
                        <span>SGST ({gstPercent / 2}%)</span>
                        <span>₹{(gstAmount / 2).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {gstType === "INTER" && (
                    <div className="d-flex justify-content-between mb-1 text-muted small">
                      <span>IGST ({gstPercent}%)</span>
                      <span>₹{gstAmount.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              <hr className="my-1" />
              <div className="d-flex justify-content-between fw-bold">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="card p-3 mb-4">
            <label className="form-label">Remarks</label>
            <textarea className="form-control" rows="3" value={remarks}
              onChange={(e) => setRemarks(e.target.value)} />
          </div>

          {/* Actions */}
          <div className="mb-4">
            <button className="btn btn-success me-2" onClick={handleCreateInvoice} disabled={loading}>
              {loading ? "Creating..." : "Create Invoice"}
            </button>
            <button className="btn btn-outline-secondary" onClick={() => {
              setOrderInputs([{ id: "", preview: null, loading: false }]);
              setGstPercent(0); setGstType("INTRA"); setPartnerType("B2B");
              setSellerGst(""); setSellerAddress(""); setRemarks("");
              setItems([{ description: "", hsnCode: "", qty: 1, rate: 0, amount: 0 }]);
            }}>
              Reset
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
