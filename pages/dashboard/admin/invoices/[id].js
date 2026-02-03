"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import Link from "next/link";

export default function InvoiceViewAdmin() {
  const router = useRouter();
  const { id } = router.query;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchInvoice = async () => {
      try {
        const res = await axios.get(`/api/admin/invoices/${id}`);
        setInvoice(res.data);
      } catch (err) {
        console.error("Fetch invoice error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  if (loading) return <div className="p-5">Loading invoice…</div>;
  if (!invoice) return <div className="p-5">Invoice not found</div>;

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={true} />

      <div className="main-area">
        <div className="container-fluid p-4">

          <div className="d-flex justify-content-between mb-5">
            <h1 className="dashboard-main-h mb-0">Invoice</h1>
            <div className="d-flex gap-2">
            <Link href="/dashboard/admin/invoices" className="btn btn-outline-secondary">
              Back
            </Link>

            {invoice.status === "DRAFT" && (
               <button
  className="btn btn-success"
  onClick={async () => {
    if (!confirm("Send this invoice? This will email the invoice PDF to the partner.")) return;

    try {
      // 1️⃣ Lock invoice
      await axios.post("/api/admin/invoices/send", {
        invoiceId: invoice._id,
      });

      // 2️⃣ Generate PDF
      await axios.post("/api/admin/invoices/generate-pdf", {
        invoiceId: invoice._id,
      });

      // 3️⃣ Send Email with PDF
      await axios.post("/api/admin/invoices/send-email", {
        invoiceId: invoice._id,
      });

      alert("Invoice sent & emailed successfully");
      location.reload();

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to send invoice");
    }
  }}
>
  Send Invoice
</button>

                )}

                </div>

          </div>

          

          {/* INVOICE CARD */}
          <div className="card p-4" style={{ maxWidth: 900, margin: "auto" }}>

            {/* HEADER */}
            <div className="d-flex justify-content-between mb-4">
              <div>
                <img src="/assets/images/logo.png" alt="Company Logo" style={{ height: 60 }} />
              
              </div>

              <div className="text-end">
                <h4>INVOICE</h4>
                <div>
                  Invoice No: <strong>{invoice.invoiceNumber}</strong>
                </div>
                <div>
                  Date: {new Date(invoice.createdAt).toLocaleDateString()}
                </div>
                <div>
                  Status: <strong>{invoice.status}</strong>
                </div>
              </div>
            </div>

            <hr />

            {/* BILL TO */}
            <div className="row mb-4">
              {/* <div className="col-md-6">
                <h6>Bill To</h6>
                <strong>{invoice.partnerName}</strong><br />
                {invoice.partnerAddress?.street}<br />
                {invoice.partnerAddress?.city}, {invoice.partnerAddress?.state}<br />
                {invoice.partnerAddress?.zip}<br />

                📞 {invoice.partnerAddress?.phone}<br/>
                📧 {invoice.partnerAddress?.email}

              </div> */}

                <div className="col-md-6">
  <h6>Bill To</h6>

  <strong>{invoice.partnerName}</strong><br />

  {invoice.partnerAddress?.companyName && (
    <>
      {invoice.partnerAddress.companyName}
      <br />
    </>
  )}

  {invoice.partnerAddress?.street && (
    <>
      {invoice.partnerAddress.street}
      <br />
    </>
  )}

  {(invoice.partnerAddress?.city ||
    invoice.partnerAddress?.state ||
    invoice.partnerAddress?.zip) && (
    <>
      {[invoice.partnerAddress.city,
        invoice.partnerAddress.state,
        invoice.partnerAddress.zip]
        .filter(Boolean)
        .join(", ")}
      <br />
    </>
  )}

  {invoice.partnerAddress?.gst && (
    <>
      <strong>GST No:</strong> {invoice.partnerAddress.gst}
      <br />
    </>
  )}

  {invoice.partnerAddress?.phone && (
    <>
      📞 {invoice.partnerAddress.phone}
      <br />
    </>
  )}

  {invoice.partnerAddress?.email && (
    <>📧 {invoice.partnerAddress.email}</>
  )}
</div>


              <div className="col-md-6 text-end">
                <h6>Order Reference</h6>
                Order No: #{invoice.orderNumber}
              </div>

              <hr />

<div className="row mb-3">
  <div className="col-md-6">
    <h6>Payment Details</h6>
    <div>
      <strong>Method:</strong>{" "}
      {invoice.paymentSnapshot?.paymentMethod || "—"}
    </div>
    <div>
      <strong>Status:</strong>{" "}
      {invoice.paymentSnapshot?.paymentStatus || "—"}
    </div>
    <div>
      <strong>Transaction ID:</strong>{" "}
      {invoice.paymentSnapshot?.transactionId || "—"}
    </div>
  </div>
</div>

            </div>

            {/* ITEMS */}
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Rate</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.description}</td>
                      <td className="text-center">{item.qty}</td>
                      <td className="text-end">₹ {item.rate}</td>
                      <td className="text-end">₹ {item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALS */}
            <div className="row justify-content-end">
              <div className="col-md-5">
                <table className="table">
                  <tbody>
                    <tr>
                      <td>Sub Total</td>
                      <td className="text-end">₹ {invoice.subTotal}</td>
                    </tr>
                    <tr>
                      <td>GST ({invoice.gstPercent}%)</td>
                      <td className="text-end">₹ {invoice.gstAmount}</td>
                    </tr>
                    <tr>
                      <th>Grand Total</th>
                      <th className="text-end">₹ {invoice.grandTotal}</th>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-4">
              <strong>Remarks:</strong>
              <div>{invoice.remarks || "—"}</div>
            </div>

            <hr />

            <div className="text-center text-muted">
              This is a system generated invoice.
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
