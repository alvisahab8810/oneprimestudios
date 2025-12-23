"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";

export default function AdminDispatchRequests() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [updatingIds, setUpdatingIds] = useState([]);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/admin/orders/dispatch-requests", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data.orders);
    } catch {
      toast.error("Failed to load dispatch requests");
    } finally {
      setLoading(false);
    }
  };

  // 🔍 FILTER
  const filteredOrders = orders.filter((order) => {
    const text =
      `${order.orderNumber} ${order.user?.name} ${order.user?.phone}`
        .toLowerCase();

    const matchSearch = text.includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "all"
        ? true
        : order.dispatchRequest === statusFilter;

    return matchSearch && matchStatus;
  });

  // 📄 PAGINATION
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredOrders.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const handleAction = async (orderId, action) => {
    try {
      setUpdatingIds((prev) => [...prev, orderId]);

      const token = localStorage.getItem("token");
      await axios.put(
        "/api/admin/orders/update-dispatch",
        { orderId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Updated successfully");

      // update locally
      setOrders((prev) =>
        prev.map((o) =>
          o._id === orderId
            ? {
                ...o,
                dispatchRequest: action,
                status:
                  action === "approved"
                    ? "Order Dispatched"
                    : o.status,
              }
            : o
        )
      );
    } catch {
      toast.error("Update failed");
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== orderId));
    }
  };

  if (loading) return <p className="text-center mt-5">Loading...</p>;

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div
        className="main-area"
        style={{ transition: "0.3s" }}
      >
        <div className="container-fluid p-4">
          <h1 className="dashboard-main-h">Dispatch Requests</h1>

          {/* FILTER BAR */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <input
              type="text"
              className="form-control w-auto"
              placeholder="Search by order, user, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: "280px" }}
            />

            <select
              className="form-select w-auto"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          <table className="table table-bordered table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>Order No</th>
                <th>Partner Name</th>
                <th>Phone</th>
                <th>Order Status</th>
                <th>Dispatch Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center">
                    No dispatch requests found.
                  </td>
                </tr>
              ) : (
                currentOrders.map((order) => {
                  const isUpdating = updatingIds.includes(order._id);

                  return (
                    <tr key={order._id}>
                      <td>{order.orderNumber}</td>
                      <td>{order.user?.name}</td>
                      <td>{order.user?.phone}</td>
                      <td>{order.status}</td>
                      <td>
                        <span
                          className={`badge ${
                            order.dispatchRequest === "approved"
                              ? "bg-success"
                              : "bg-warning text-dark"
                          }`}
                        >
                          {order.dispatchRequest}
                        </span>
                      </td>
                      <td>
                        {order.dispatchRequest === "pending" && (
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() =>
                              handleAction(order._id, "approved")
                            }
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <span className="spinner-border spinner-border-sm" />
                            ) : (
                              "Approve"
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div className="d-flex justify-content-center mt-3">
            <nav>
              <ul className="pagination">
                <li
                  className={`page-item ${
                    currentPage === 1 ? "disabled" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() =>
                      setCurrentPage((prev) => prev - 1)
                    }
                  >
                    Previous
                  </button>
                </li>

                {[...Array(totalPages)].map((_, index) => (
                  <li
                    key={index}
                    className={`page-item ${
                      currentPage === index + 1 ? "active" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(index + 1)}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}

                <li
                  className={`page-item ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                >
                  <button
                    className="page-link"
                    onClick={() =>
                      setCurrentPage((prev) => prev + 1)
                    }
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
