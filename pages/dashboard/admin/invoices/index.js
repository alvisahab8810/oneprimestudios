"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import toast from "react-hot-toast";
import Link from "next/link";

export default function AdminInvoiceList() {
  const [sidebarOpen] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/admin/invoices");
      setInvoices(res.data || []);
    } catch (err) {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const sendInvoice = async (invoiceId) => {
    if (!confirm("Send this invoice? After sending, it cannot be edited.")) return;

    try {
      await axios.post("/api/admin/invoices/send", { invoiceId });
      toast.success("Invoice sent");
      fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send invoice");
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="container-fluid p-4">

          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h1 className="dashboard-main-h">Invoices</h1>
            <Link href="/dashboard/admin/invoices/create" className="btn btn-primary">
              + Create Invoice
            </Link>
          </div>

          {/* Table */}
          <div className="card p-3">
            {loading ? (
              <div>Loading...</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered align-middle">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Order No</th>
                      <th>Partner</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center text-muted">
                          No invoices found
                        </td>
                      </tr>
                    )}

                    {invoices.map((inv) => (
                      <tr key={inv._id}>
                        <td>{inv.invoiceNumber}</td>
                        <td>#{inv.orderNumber}</td>
                        <td>{inv.partnerName || "—"}</td>
                        <td>₹ {inv.grandTotal}</td>
                        <td>
                          <span
                            className={`badge ${
                              inv.status === "SENT"
                                ? "bg-success"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td>{new Date(inv.createdAt).toLocaleString()}</td>
                        <td>
                          <Link
                            href={`/dashboard/admin/invoices/${inv._id}`}
                            className="btn btn-sm btn-outline-primary me-2"
                          >
                            View
                          </Link>

                          {inv.status === "DRAFT" && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => sendInvoice(inv._id)}
                            >
                              Send
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
