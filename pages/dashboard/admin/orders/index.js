// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import Link from "next/link";
// import { toast } from "react-hot-toast";
// import { useRouter } from "next/navigation";
// import Sidebar from "@/components/admin-panel/Sidebar";
// import {
//   FaBell,
//   FaClipboardList,
//   FaShoppingCart,
//   FaTruck,
//   FaCheckCircle,
//   FaTimesCircle,
//   FaBoxOpen,
// } from "react-icons/fa";

// export default function AdminOrdersPage() {
//   const [searchQuery, setSearchQuery] = useState("");

//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const [statusFilter, setStatusFilter] = useState("");
//   const [userTypeFilter, setUserTypeFilter] = useState(""); // NEW
//   const [page, setPage] = useState(1); // NEW
//   const [totalPages, setTotalPages] = useState(1); // NEW

//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const router = useRouter();

//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

//   const loadOrders = async () => {
//     try {
//       // const res = await axios.get(
//       //   `/api/admin/orders?page=${page}${
//       //     statusFilter ? `&status=${statusFilter}` : ""
//       //   }${userTypeFilter ? `&userType=${userTypeFilter}` : ""}`,
//       //   { withCredentials: true }
//       // );

//       const res = await axios.get(
//         `/api/admin/orders?page=${page}${
//           statusFilter ? `&status=${statusFilter}` : ""
//         }${userTypeFilter ? `&userType=${userTypeFilter}` : ""}${
//           searchQuery ? `&search=${searchQuery}` : ""
//         }`,
//         { withCredentials: true }
//       );

//       setOrders(res.data.orders || []);
//       setTotalPages(res.data.totalPages || 1);
//     } catch (err) {
//       console.error("Admin orders error:", err.response?.data || err.message);
//       toast.error(err.response?.data?.message || "Failed to load orders");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadOrders();
//   }, [statusFilter, userTypeFilter, page, searchQuery]);

//   if (loading)
//     return <div className="p-5 text-center fw-semibold">Loading orders...</div>;

//   const totalOrders = orders.length;
//   const delivered = orders.filter((o) => o.status === "Order Delivered").length;
//   const received = orders.filter((o) => o.status === "Order Received").length;
//   const inProgress = orders.filter((o) => o.status === "In Progress").length;

//   // Detect B2B / B2C
//   const getUserTypeLabel = (u) =>
//     u?.userType === "partner" ? (
//       <span className="badge bg-primary">B2B</span>
//     ) : u?.userType === "customer" ? (
//       <span className="badge bg-success">B2C</span>
//     ) : (
//       "—"
//     );

//   return (
//     <div className="d-flex bg-light min-vh-100">
//       <Sidebar sidebarOpen={sidebarOpen} />

//       {/* Main Area */}
//       <div
//         className="flex-grow-1"
//         style={{ marginLeft: sidebarOpen ? "220px" : "0", transition: "0.3s" }}
//       >
//         {/* Navbar */}
//         <nav className="navbar navbar-expand-lg navbar-light bg-white px-4 shadow-sm sticky-top">
//           <button
//             className="btn btn-outline-primary me-3"
//             onClick={toggleSidebar}
//           >
//             ☰
//           </button>
//           <h5 className="mb-0 fw-semibold">Admin Dashboard</h5>
//           <div className="ms-auto d-flex align-items-center">
//             <FaBell className="me-3 text-muted" size={20} />
//           </div>
//         </nav>

//         {/* Page Content */}
//         <div className="p-4">
//           <div className="d-flex justify-content-between align-items-center mb-4">
//             <h4 className="fw-bold mb-0">Orders Overview</h4>

//             <input
//               type="text"
//               className="form-control w-auto shadow-sm"
//               placeholder="Search by name or order ID"
//               value={searchQuery}
//               onChange={(e) => {
//                 setPage(1);
//                 setSearchQuery(e.target.value);
//               }}
//               style={{ minWidth: "220px" }}
//             />

//             <div className="d-flex gap-3">
//               {/* STATUS FILTER */}
//               <select
//                 className="form-select w-auto shadow-sm"
//                 value={statusFilter}
//                 onChange={(e) => {
//                   setPage(1);
//                   setStatusFilter(e.target.value);
//                 }}
//               >
//                 <option value="">All Status</option>
//                 <option value="Order Received">Order Received</option>
//                 <option value="Design Approved">Design Approved</option>
//                 <option value="Design Rejected">Design Rejected</option>
//                 <option value="In Progress">In Progress</option>
//                 <option value="In Packaging">In Packaging</option>
//                 <option value="Order Dispatched">Order Dispatched</option>
//                 <option value="Order Delivered">Order Delivered</option>
//               </select>

//               {/* USER TYPE FILTER */}
//               <select
//                 className="form-select w-auto shadow-sm"
//                 value={userTypeFilter}
//                 onChange={(e) => {
//                   setPage(1);
//                   setUserTypeFilter(e.target.value);
//                 }}
//               >
//                 <option value="">All Users</option>
//                 <option value="partner">B2B</option>
//                 <option value="customer">B2C</option>
//               </select>
//             </div>
//           </div>

//           {/* Orders Table */}
//           <div className="card shadow-sm border-0">
//             <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
//               <h6 className="fw-bold mb-0">Orders List</h6>
//               {/* <button onClick={loadOrders} className="btn btn-sm btn-outline-secondary">
//                 Refresh
//               </button> */}
//             </div>

//             <div className="table-responsive">
//               <table className="table table-hover align-middle mb-0">
//                 <thead className="table-light">
//                   <tr>
//                     <th>Order No</th>
//                     <th>Products</th>
//                     <th>Customer</th>
//                     <th>Type</th>
//                     <th>Total</th>
//                     <th>Status</th>
//                     <th>Payment</th>
//                     <th>Date</th>
//                     <th>Actions</th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {orders.length > 0 ? (
//                     orders.map((o) => (
//                       <tr key={o._id}>
//                         <td className="fw-semibold">#{o.orderNumber}</td>
//                         <td style={{ maxWidth: "280px" }}>
//                           <ul className="list-unstyled mb-0">
//                             {o.items?.map((item, idx) => (
//                               <li key={idx} className="small mb-1">
//                                 <strong>{item.product?.name}</strong>
//                                 <br />
//                                 Qty: {item.quantity} × ₹{item.price}
//                               </li>
//                             ))}
//                           </ul>
//                         </td>

//                         <td>{o.user?.name || "—"}</td>
//                         <td>{getUserTypeLabel(o.user)}</td>
//                         <td>₹{o.total}</td>
//                         <td>
//                           <span
//                             className={`badge rounded-pill bg-${getStatusColor(
//                               o.status
//                             )}`}
//                           >
//                             {o.status}
//                           </span>
//                         </td>
//                         <td>{o.paymentMethod || "—"}</td>
//                         <td>
//                           {new Date(o.createdAt).toLocaleDateString("en-IN", {
//                             day: "2-digit",
//                             month: "short",
//                             year: "numeric",
//                           })}
//                         </td>
//                         <td>
//                           <Link
//                             href={`/dashboard/admin/orders/${o._id}`}
//                             className="btn btn-sm btn-outline-primary"
//                           >
//                             View / Update
//                           </Link>
//                         </td>
//                       </tr>
//                     ))
//                   ) : (
//                     <tr>
//                       <td colSpan="8" className="text-center text-muted py-4">
//                         No orders found
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>

//             {/* PAGINATION */}
//             <div className="d-flex justify-content-between p-3">
//               <button
//                 className="btn btn-outline-secondary"
//                 disabled={page === 1}
//                 onClick={() => setPage((p) => p - 1)}
//               >
//                 ← Previous
//               </button>

//               <span className="fw-semibold">
//                 Page {page} of {totalPages}
//               </span>

//               <button
//                 className="btn btn-outline-secondary"
//                 disabled={page === totalPages}
//                 onClick={() => setPage((p) => p + 1)}
//               >
//                 Next →
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function getStatusColor(status) {
//   switch (status) {
//     case "Order Received":
//       return "info";
//     case "Design Approved":
//       return "success";
//     case "Design Rejected":
//       return "danger";
//     case "In Progress":
//       return "warning";
//     case "In Packaging":
//       return "secondary";
//     case "Order Dispatched":
//       return "primary";
//     case "Order Delivered":
//       return "success";
//     default:
//       return "dark";
//   }
// }

"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import * as XLSX from "xlsx";

import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/admin-panel/Sidebar";
import {
  FaBell,
  FaClipboardList,
  FaShoppingCart,
  FaTruck,
  FaCheckCircle,
  FaTimesCircle,
  FaBoxOpen,
} from "react-icons/fa";

export default function AdminOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState(""); // NEW
  const [page, setPage] = useState(1); // NEW
  const [totalPages, setTotalPages] = useState(1); // NEW

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const exportToExcel = () => {
    const data = orders.map((o) => ({
      OrderNo: o.orderNumber,
      Customer: o.user?.name,
      UserType: o.user?.userType,
      Total: o.total,
      Status: o.status,
      Payment: o.paymentMethod,
      Products: o.items.map((i) => i.product?.name).join(", "),
      CreatedAt: new Date(o.createdAt).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "orders.xlsx");
  };

  const loadOrders = async () => {
    try {
      // const res = await axios.get(
      //   `/api/admin/orders?page=${page}${
      //     statusFilter ? `&status=${statusFilter}` : ""
      //   }${userTypeFilter ? `&userType=${userTypeFilter}` : ""}`,
      //   { withCredentials: true }
      // );

      const res = await axios.get(
        `/api/admin/orders?page=${page}${
          statusFilter ? `&status=${statusFilter}` : ""
        }${userTypeFilter ? `&userType=${userTypeFilter}` : ""}${
          searchQuery ? `&search=${searchQuery}` : ""
        }`,
        { withCredentials: true }
      );

      setOrders(res.data.orders || []);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Admin orders error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, userTypeFilter, page, searchQuery]);

  if (loading)
    return <div className="p-5 text-center fw-semibold">Loading orders...</div>;

  const totalOrders = orders.length;
  const delivered = orders.filter((o) => o.status === "Order Delivered").length;
  const received = orders.filter((o) => o.status === "Order Received").length;
  const inProgress = orders.filter((o) => o.status === "In Progress").length;

  // Detect B2B / B2C
  const getUserTypeLabel = (u) =>
    u?.userType === "partner" ? (
      <span className="badge bg-primary">B2B</span>
    ) : u?.userType === "customer" ? (
      <span className="badge bg-success">B2C</span>
    ) : (
      "—"
    );

  const handleBulkDelete = async () => {
    if (!confirm("Are you sure you want to delete selected orders?")) return;

    try {
      await axios.post(
        "/api/admin/orders/bulk-delete",
        { ids: selectedOrders },
        { withCredentials: true }
      );

      toast.success("Orders deleted successfully");
      setSelectedOrders([]);
      loadOrders();
    } catch (err) {
      toast.error("Failed to delete orders");
    }
  };

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />

      {/* Main Area */}
      <div className="main-area">
        {/* Navbar */}
        <nav className="navbar navbar-expand-lg navbar-light bg-white px-4 shadow-sm sticky-top">
          <button
            className="btn btn-outline-primary me-3"
            onClick={toggleSidebar}
          >
            ☰
          </button>
          {/* <h5 className="dashboard-main-h">Admin Dashboard</h5> */}
          <div className="ms-auto d-flex align-items-center">
            <FaBell className="me-3 text-muted" size={20} />
          </div>
        </nav>

        {/* Page Content */}
        <div className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold mb-0">Orders Overview</h4>

            <input
              type="text"
              className="form-control w-auto shadow-sm"
              placeholder="Search by name or order ID"
              value={searchQuery}
              onChange={(e) => {
                setPage(1);
                setSearchQuery(e.target.value);
              }}
              style={{ minWidth: "220px" }}
            />

            <div className="d-flex gap-3">
              {/* STATUS FILTER */}
              <select
                className="form-select w-auto shadow-sm"
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
              >
                <option value="">All Status</option>
                <option value="Order Received">Order Received</option>
                <option value="Design Approved">Design Approved</option>
                <option value="Design Rejected">Design Rejected</option>
                <option value="In Progress">In Progress</option>
                <option value="In Packaging">In Packaging</option>
                <option value="Order Dispatched">Order Dispatched</option>
                <option value="Order Delivered">Order Delivered</option>
              </select>

              {/* USER TYPE FILTER */}
              <select
                className="form-select w-auto shadow-sm"
                value={userTypeFilter}
                onChange={(e) => {
                  setPage(1);
                  setUserTypeFilter(e.target.value);
                }}
              >
                <option value="">All Users</option>
                <option value="partner">B2B</option>
                <option value="customer">B2C</option>
              </select>
            </div>

            <button
              className="btn btn-danger btn-sm"
              disabled={!selectedOrders.length}
              onClick={handleBulkDelete}
            >
              Delete Selected
            </button>

            <button className="btn btn-success btn-sm" onClick={exportToExcel}>
              Export Excel
            </button>
          </div>

          {/* Orders Table */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">Orders List</h6>
              {/* <button onClick={loadOrders} className="btn btn-sm btn-outline-secondary">
                Refresh
              </button> */}
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          selectedOrders.length === orders.length &&
                          orders.length > 0
                        }
                        onChange={(e) =>
                          setSelectedOrders(
                            e.target.checked ? orders.map((o) => o._id) : []
                          )
                        }
                      />
                    </th>

                    <th>Order No</th>
                    <th>Products</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.length > 0 ? (
                    orders.map((o) => (
                      <tr key={o._id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(o._id)}
                            onChange={() =>
                              setSelectedOrders((prev) =>
                                prev.includes(o._id)
                                  ? prev.filter((id) => id !== o._id)
                                  : [...prev, o._id]
                              )
                            }
                          />
                        </td>

                        <td className="fw-semibold">#{o.orderNumber}</td>

                        <td style={{ maxWidth: "320px" }}>
                          {o.items?.map((item, idx) => (
                            <div
                              key={idx}
                              className="d-flex align-items-center mb-2"
                              style={{ gap: "10px" }}
                            >
                              {/* PRODUCT IMAGE */}
                              {/* <img
                                  src={
                                    item.product?.images?.[0]
                                      ? item.product.images[0]
                                      : "/no-image.png"
                                  }
                                  alt={item.product?.name}
                                  style={{
                                    width: "40px",
                                    height: "40px",
                                    objectFit: "cover",
                                    borderRadius: "6px",
                                    border: "1px solid #ddd",
                                  }}
                                /> */}

                              {/* PRODUCT INFO */}
                              <div style={{ lineHeight: "1.2" }}>
                                <div className="fw-semibold small">
                                  {item.product?.name || "Product"}
                                </div>
                                <div className="text-muted small">
                                  Qty: {item.quantity} × ₹{item.price}
                                </div>
                              </div>
                            </div>
                          ))}
                        </td>

                        <td>{o.user?.name || "—"}</td>
                        <td>{getUserTypeLabel(o.user)}</td>
                        <td>₹{o.total}</td>
                        <td>
                          <span
                            className={`badge rounded-pill bg-${getStatusColor(
                              o.status
                            )}`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td>{o.paymentMethod || "—"}</td>
                        <td>
                          {new Date(o.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/admin/orders/${o._id}`}
                            className="btn btn-sm btn-outline-primary"
                          >
                            View / Update
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-4">
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="d-flex justify-content-between p-3">
              <button
                className="btn btn-outline-secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>

              <span className="fw-semibold">
                Page {page} of {totalPages}
              </span>

              <button
                className="btn btn-outline-secondary"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case "Order Received":
      return "info";
    case "Design Approved":
      return "success";
    case "Design Rejected":
      return "danger";
    case "In Progress":
      return "warning";
    case "In Packaging":
      return "secondary";
    case "Order Dispatched":
      return "primary";
    case "Order Delivered":
      return "success";
    default:
      return "dark";
  }
}
