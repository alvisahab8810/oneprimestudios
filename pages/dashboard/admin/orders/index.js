


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
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [statusFilter, setStatusFilter] = useState("");
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const router = useRouter();

//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

//   const loadOrders = async () => {
//     try {
//       const res = await axios.get(
//         `/api/admin/orders${statusFilter ? `?status=${statusFilter}` : ""}`,
//         { withCredentials: true }
//       );
//       setOrders(res.data.orders || []);
//     } catch (err) {
//       console.error("Admin orders error:", err.response?.data || err.message);
//       toast.error(err.response?.data?.message || "Failed to load orders");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadOrders();
//   }, [statusFilter]);

//   if (loading)
//     return <div className="p-5 text-center fw-semibold">Loading orders...</div>;

//   const totalOrders = orders.length;
//   const delivered = orders.filter((o) => o.status === "Order Delivered").length;
//   const received = orders.filter((o) => o.status === "Order Received").length;
//   const inProgress = orders.filter((o) => o.status === "In Progress").length;

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
//             <div className="dropdown">
//               <button
//                 className="btn btn-outline-secondary dropdown-toggle"
//                 type="button"
//                 id="profileDropdown"
//                 data-bs-toggle="dropdown"
//                 aria-expanded="false"
//               >
//                 Admin
//               </button>
//               <ul
//                 className="dropdown-menu dropdown-menu-end"
//                 aria-labelledby="profileDropdown"
//               >
//                 <li>
//                   <Link className="dropdown-item" href="#">
//                     Profile
//                   </Link>
//                 </li>
//                 <li>
//                   <Link className="dropdown-item" href="#">
//                     Logout
//                   </Link>
//                 </li>
//               </ul>
//             </div>
//           </div>
//         </nav>

//         {/* Page Content */}
//         <div className="p-4">
//           <div className="d-flex justify-content-between align-items-center mb-4">
//             <h4 className="fw-bold mb-0">Orders Overview</h4>
//             <select
//               className="form-select w-auto shadow-sm"
//               value={statusFilter}
//               onChange={(e) => setStatusFilter(e.target.value)}
//             >
//               <option value="">All Orders</option>
//               <option value="Order Received">Order Received</option>
//               <option value="Design Approved">Design Approved</option>
//               <option value="Design Rejected">Design Rejected</option>
//               <option value="In Progress">In Progress</option>
//               <option value="In Packaging">In Packaging</option>
//               <option value="Order Dispatched">Order Dispatched</option>
//               <option value="Order Delivered">Order Delivered</option>
//             </select>
//           </div>

//           {/* Summary Cards */}
//           <div className="row g-3 mb-4">
//             <SummaryCard
//               icon={<FaClipboardList />}
//               title="Total Orders"
//               value={totalOrders}
//               color="primary"
//             />
//             <SummaryCard
//               icon={<FaShoppingCart />}
//               title="Received"
//               value={received}
//               color="info"
//             />
//             <SummaryCard
//               icon={<FaTruck />}
//               title="In Progress"
//               value={inProgress}
//               color="warning"
//             />
//             <SummaryCard
//               icon={<FaCheckCircle />}
//               title="Delivered"
//               value={delivered}
//               color="success"
//             />
//           </div>

//           {/* Orders Table */}
//           <div className="card shadow-sm border-0">
//             <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
//               <h6 className="fw-bold mb-0">Recent Orders</h6>
//               <button
//                 onClick={loadOrders}
//                 className="btn btn-sm btn-outline-secondary"
//               >
//                 Refresh
//               </button>
//             </div>
//             <div className="table-responsive">
//               <table className="table table-hover align-middle mb-0">
//                 <thead className="table-light">
//                   <tr>
//                     <th>Order No</th>
//                     <th>Customer</th>
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
//                         <td>{o.user?.name || "—"}</td>
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
//                       <td colSpan="7" className="text-center text-muted py-4">
//                         No orders found
//                       </td>
//                     </tr>
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Summary Card
// function SummaryCard({ icon, title, value, color }) {
//   return (
//     <div className="col-md-3">
//       <div
//         className={`card border-0 shadow-sm bg-${color}-subtle text-${color} text-center p-3`}
//       >
//         <div className="fs-3 mb-2">{icon}</div>
//         <h6 className="fw-semibold">{title}</h6>
//         <h4 className="fw-bold mb-0">{value}</h4>
//       </div>
//     </div>
//   );
// }

// // Status Badge Colors
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
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState(""); // NEW
  const [page, setPage] = useState(1); // NEW
  const [totalPages, setTotalPages] = useState(1); // NEW

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const loadOrders = async () => {
    try {
      const res = await axios.get(
        `/api/admin/orders?page=${page}${
          statusFilter ? `&status=${statusFilter}` : ""
        }${userTypeFilter ? `&userType=${userTypeFilter}` : ""}`,
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
  }, [statusFilter, userTypeFilter, page]);

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

  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />

      {/* Main Area */}
      <div
        className="flex-grow-1"
        style={{ marginLeft: sidebarOpen ? "220px" : "0", transition: "0.3s" }}
      >
        {/* Navbar */}
        <nav className="navbar navbar-expand-lg navbar-light bg-white px-4 shadow-sm sticky-top">
          <button className="btn btn-outline-primary me-3" onClick={toggleSidebar}>
            ☰
          </button>
          <h5 className="mb-0 fw-semibold">Admin Dashboard</h5>
          <div className="ms-auto d-flex align-items-center">
            <FaBell className="me-3 text-muted" size={20} />
          </div>
        </nav>

        {/* Page Content */}
        <div className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4 className="fw-bold mb-0">Orders Overview</h4>

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
          </div>

          {/* Orders Table */}
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">Orders List</h6>
              <button onClick={loadOrders} className="btn btn-sm btn-outline-secondary">
                Refresh
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Order No</th>
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
                        <td className="fw-semibold">#{o.orderNumber}</td>
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

              <span className="fw-semibold">Page {page} of {totalPages}</span>

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
