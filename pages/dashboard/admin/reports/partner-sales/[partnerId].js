"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";

const ITEMS_PER_PAGE = 10;

export default function PartnerSalesDetail() {
  const router = useRouter();
  const { partnerId } = router.query;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  const [partner, setPartner] = useState(null);
  const [orders, setOrders] = useState([]);

  // 🔍 Filters
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!partnerId) return;
    fetchDetails();
  }, [partnerId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `/api/admin/reports/partner-sales/${partnerId}`,
        { withCredentials: true }
      );

      setPartner(res.data.partner);
      setOrders(res.data.orders || []);
    } catch (err) {
      alert("Failed to load partner details");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FILTERED ORDERS
  // =========================
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status
      if (status && o.status !== status) return false;

      // Date range
      const orderDate = new Date(o.createdAt);
      if (from && orderDate < new Date(from)) return false;
      if (to && orderDate > new Date(to + "T23:59:59")) return false;

      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchOrderNo = o.orderNumber?.toLowerCase().includes(q);
        const matchProduct = o.items?.some((it) =>
          it.product?.name?.toLowerCase().includes(q)
        );
        if (!matchOrderNo && !matchProduct) return false;
      }

      return true;
    });
  }, [orders, status, from, to, search]);

  // =========================
  // PAGINATION
  // =========================
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [status, from, to, search]);

  // =========================
  // SUMMARY
  // =========================
  const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area p-4 w-100">
        {loading ? (
          <div className="text-center fw-semibold">Loading…</div>
        ) : (
          <>
            <h4 className="fw-bold mb-1">{partner?.name}</h4>
            <p className="text-muted mb-4">
              {partner?.companyName} | {partner?.memberId}
            </p>

            {/* ================= SUMMARY ================= */}
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card p-3 shadow-sm">
                  <strong>Total Orders</strong>
                  <h4>{filteredOrders.length}</h4>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card p-3 shadow-sm">
                  <strong>Total Sales</strong>
                  <h4 className="text-success">
                    ₹{totalSales.toLocaleString("en-IN")}
                  </h4>
                </div>
              </div>
            </div>

            {/* ================= FILTER BAR ================= */}
            <div className="card p-3 mb-4 shadow-sm">
              <div className="row g-3 align-items-end">
                <div className="col-md-3">
                  <label className="form-label">Order Status</label>
                  <select
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="Pending">Pending</option>
                    <option value="Order Ready">Order Ready</option>
                    <option value="Order Dispatched">Order Dispatched</option>
                    <option value="Order Delivered">Order Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label">From Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">To Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label">Search</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Order no / Product name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ================= TABLE ================= */}
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Orders</h5>

                <table className="table table-bordered align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Order No</th>
                      <th>Date</th>
                      <th>Products</th>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedOrders.map((o, i) => (
                      <tr key={o._id}>
                        <td>
                          {(currentPage - 1) * ITEMS_PER_PAGE + i + 1}
                        </td>
                        <td className="fw-semibold">{o.orderNumber}</td>
                        <td>
                          {new Date(o.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          {o.items.map((it, idx) => (
                            <div key={idx} className="small">
                              • {it.product?.name || "Deleted Product"} ×{" "}
                              {it.quantity}
                            </div>
                          ))}
                        </td>
                        <td>
                          <span className="badge bg-secondary">
                            {o.status}
                          </span>
                        </td>
                        <td className="fw-bold">₹{o.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredOrders.length === 0 && (
                  <div className="text-center text-muted py-4">
                    No orders found
                  </div>
                )}

                {/* ================= PAGINATION ================= */}
                {totalPages > 1 && (
                  <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                    <button
                      className="btn btn-outline-secondary"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      ← Previous
                    </button>

                    <span className="fw-semibold">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      className="btn btn-outline-secondary"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
