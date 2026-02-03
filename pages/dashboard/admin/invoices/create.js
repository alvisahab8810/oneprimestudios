"use client";

import React, { useState } from "react";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import toast from "react-hot-toast";
import Link from "next/link";

export default function CreateInvoiceAdmin() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [orderId, setOrderId] = useState("");
  const [gstPercent, setGstPercent] = useState(18);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const [orderPreview, setOrderPreview] = useState(null);
const [previewLoading, setPreviewLoading] = useState(false);

  const [items, setItems] = useState([
    { description: "", qty: 1, rate: 0, amount: 0 }
  ]);

  // 🔹 Item change
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === "qty" || field === "rate") {
      updated[index].amount =
        Number(updated[index].qty) * Number(updated[index].rate);
    }

    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { description: "", qty: 1, rate: 0, amount: 0 }]);
  };

  const removeItemRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // 🔹 Create Invoice
  const handleCreateInvoice = async () => {
    if (!orderId.trim()) {
      return toast.error("Order ID is required");
    }

    if (items.length === 0) {
      return toast.error("At least one item is required");
    }

    try {
      setLoading(true);

      await axios.post("/api/admin/invoices/create", {
        orderId,
        items,
        gstPercent,
        remarks
      });

      toast.success("Invoice created successfully (DRAFT)");

      // reset
      setOrderId("");
      setRemarks("");
      setItems([{ description: "", qty: 1, rate: 0, amount: 0 }]);

    } catch (err) {
      console.error("create invoice:", err);
      toast.error(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };



const fetchOrderPreview = async () => {
  if (!orderId.trim()) return;

  try {
    setPreviewLoading(true);

    const res = await axios.get(
      `/api/admin/orders/preview?orderId=${encodeURIComponent(orderId)}`
    );

    setOrderPreview(res.data);

    // 🔥 Auto-fill invoice items
    if (res.data.items && res.data.items.length > 0) {
      setItems(res.data.items);
    }

  } catch (err) {
    setOrderPreview(null);
    toast.error(err.response?.data?.message || "Failed to fetch order");
  } finally {
    setPreviewLoading(false);
  }
};


  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="container-fluid p-4">

          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h1 className="dashboard-main-h">Create Invoice</h1>
            <Link href="/dashboard/admin/invoices" className="btn btn-outline-secondary">
              Back to Invoices
            </Link>
          </div>

          {/* Invoice Form */}
          <div className="card p-3 mb-4">
            <h5 className="mb-3">Invoice Details</h5>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Order ID</label>
                <input
                className="form-control"
                placeholder="Paste Order ID"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                onBlur={fetchOrderPreview}
                />


                {previewLoading && (
  <div className="alert alert-info mt-3">Fetching order details…</div>
)}

{orderPreview && (
  <div className="card mt-3 p-3 bg-light">
    <h6 className="mb-2">Order Preview (Read-only)</h6>

    <div className="row g-2">
      <div className="col-md-4">
         <strong>Partner:</strong><br />
{orderPreview.partnerName}<br />
<span className="text-muted" style={{ fontSize: "13px" }}>
  {orderPreview.partnerAddress?.street}
  {orderPreview.partnerAddress?.city && `, ${orderPreview.partnerAddress.city}`}
  {orderPreview.partnerAddress?.state && `, ${orderPreview.partnerAddress.state}`}
  {orderPreview.partnerAddress?.zip && ` - ${orderPreview.partnerAddress.zip}`}<br />
  📞 {orderPreview.partnerAddress?.phone}<br/>
  📧 {orderPreview.partnerAddress?.email}

</span>

      </div>

      <div className="col-md-4">
        <strong>Order Date:</strong><br />
        {new Date(orderPreview.orderDate).toLocaleString()}
      </div>

      <div className="col-md-4">
        <strong>Order Amount:</strong><br />
        ₹ {orderPreview.orderAmount}
      </div>

      <div className="col-md-4 mt-2">
        <strong>Payment Status:</strong><br />
        {orderPreview.paymentStatus}
      </div>

      <div className="col-md-4 mt-2">
        <strong>Payment Method:</strong><br />
        {orderPreview.paymentMethod}
      </div>

      <div className="col-md-4 mt-2">
        <strong>Transaction ID:</strong><br />
        {orderPreview.transactionId || "—"}
      </div>
    </div>
  </div>
)}


              </div>

              <div className="col-md-3">
                <label className="form-label">GST %</label>
                <input
                  type="number"
                  className="form-control"
                  value={gstPercent}
                  onChange={(e) => setGstPercent(e.target.value)}
                />
              </div>
            </div>

            {/* Items */}
            <hr />
            <h6>Invoice Items</h6>

            {items.map((item, index) => (
              <div className="row g-2 align-items-end mb-2" key={index}>
                <div className="col-md-4">
                  <label className="form-label">Description</label>
                  <input
                    className="form-control"
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(index, "description", e.target.value)
                    }
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Qty</label>
                  <input
                    type="number"
                    className="form-control"
                    value={item.qty}
                    onChange={(e) =>
                      handleItemChange(index, "qty", e.target.value)
                    }
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Rate</label>
                  <input
                    type="number"
                    className="form-control"
                    value={item.rate}
                    onChange={(e) =>
                      handleItemChange(index, "rate", e.target.value)
                    }
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">Amount</label>
                  <input className="form-control" value={item.amount} disabled />
                </div>
                <div className="col-md-2">
                  <button
                    className="btn btn-outline-danger w-100"
                    onClick={() => removeItemRow(index)}
                    disabled={items.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            <button className="btn btn-outline-primary mt-2" onClick={addItemRow}>
              + Add Item
            </button>

            {/* Remarks */}
            <div className="mt-4">
              <label className="form-label">Remarks</label>
              <textarea
                className="form-control"
                rows="3"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="mt-4">
              <button
                className="btn btn-success me-2"
                onClick={handleCreateInvoice}
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Invoice"}
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => {
                  setOrderId("");
                  setRemarks("");
                  setItems([{ description: "", qty: 1, rate: 0, amount: 0 }]);
                }}
              >
                Reset
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
