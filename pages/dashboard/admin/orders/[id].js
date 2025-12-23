// "use client";
// export const dynamic = "force-dynamic";
// import { FaUser, FaChartPie, FaUsers, FaCogs, FaBell } from "react-icons/fa";
// import Link from "next/link";
// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import axios from "axios";
// import { toast } from "react-hot-toast";
// import Sidebar from "@/components/admin-panel/Sidebar";

// export default function AdminOrderDetail() {
//   const params = useParams();
//   const id = params?.id;
//   const router = useRouter();
//   const [order, setOrder] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [newStatus, setNewStatus] = useState("");

//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

//   useEffect(() => {
//     if (!id) return;
//     axios
//       .get(`/api/admin/orders/${id}`, { withCredentials: true }) // ✅ FIXED ROUTE
//       .then((res) => {
//         setOrder(res.data.order);
//         setNewStatus(res.data.order.status);
//       })
//       .catch((err) => {
//         console.error(err);
//         toast.error("Failed to load order");
//         router.push("/dashboard/admin/orders");
//       })
//       .finally(() => setLoading(false));
//   }, [id]);

//   const updateStatus = async () => {
//     try {
//       await axios.put(
//         `/api/admin/orders/${id}`,
//         { status: newStatus },
//         { withCredentials: true }
//       );
//       toast.success("Order status updated");
//       setOrder((prev) => ({ ...prev, status: newStatus }));
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to update status");
//     }
//   };

//   if (loading) return <div className="p-5 text-center">Loading...</div>;
//   if (!order) return <div className="p-5 text-center">Order not found</div>;

//   return (
//     <div className="d-flex">
//       <Sidebar sidebarOpen={sidebarOpen} />

//       {/* Main content */}
//       <div
//         className="flex-grow-1"
//         style={{ marginLeft: sidebarOpen ? "220px" : "0", transition: "0.3s" }}
//       >
//         {/* Top navbar */}
//         <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 shadow-sm">
//           <button
//             className="btn btn-outline-primary me-3"
//             onClick={toggleSidebar}
//           >
//             ☰
//           </button>
//           <div className="ms-auto d-flex align-items-center">
//             <FaBell className="me-3" size={20} />
//             <div className="dropdown">
//               <button
//                 className="btn btn-secondary dropdown-toggle"
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
//         <div className="flex-grow-1 p-4">
//           <div title={`Order #${order.orderNumber}`} />
//           <div className="card p-3">
//             <h5>Customer Details</h5>
//             <div>{order.user?.name}</div>
//             <div>{order.user?.email}</div>

//             <hr />
//             <h5>Shipping</h5>
//             <div>{order.shipping?.name}</div>
//             <div>{order.shipping?.phone}</div>
//             <div>
//               {order.shipping?.street}, {order.shipping?.city},{" "}
//               {order.shipping?.state} - {order.shipping?.zip}
//             </div>

//             <hr />
//             <h5>Items</h5>
//             {order.items?.map((it) => (
//               <div key={it._id} className="d-flex align-items-center mb-2">
//                 <img
//                   src={it.product?.mainImage || "/no-image.png"}
//                   alt=""
//                   width={60}
//                   height={60}
//                   style={{ objectFit: "cover" }}
//                 />
//                 <div className="ms-2">
//                   <div>{it.product?.name}</div>
//                   <div className="small text-muted">
//                     Qty: {it.quantity} × ₹{it.price}
//                   </div>
//                 </div>
//               </div>
//             ))}

//             <hr />
//             <div className="d-flex justify-content-between align-items-center">
//               <div>
//                 <strong>Total:</strong> ₹{order.total}
//               </div>
//               <div>
//                 <select
//                   value={newStatus}
//                   onChange={(e) => setNewStatus(e.target.value)}
//                   className="form-select d-inline w-auto me-2"
//                 >
//                   <option value="Pending">Pending</option>
//                   <option value="Confirmed">Confirmed</option>
//                   <option value="Shipped">Shipped</option>
//                   <option value="Delivered">Delivered</option>
//                   <option value="Cancelled">Cancelled</option>
//                 </select>
//                 <button className="btn btn-primary" onClick={updateStatus}>
//                   Update Status
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// "use client";
// export const dynamic = "force-dynamic";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import Link from "next/link";
// import axios from "axios";
// import { toast } from "react-hot-toast";
// import {
//   FaBell,
//   FaBoxOpen,
//   FaUser,
//   FaTruck,
//   FaCalendarAlt,
//   FaCreditCard,
//   FaRupeeSign,
// } from "react-icons/fa";
// import Sidebar from "@/components/admin-panel/Sidebar";

// export default function AdminOrderDetail() {
//   const params = useParams();
//   const id = params?.id;
//   const router = useRouter();

//   const [order, setOrder] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [newStatus, setNewStatus] = useState("");
//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

//   useEffect(() => {
//     if (!id) return;
//     axios
//       .get(`/api/admin/orders/${id}`, { withCredentials: true })
//       .then((res) => {
//         setOrder(res.data.order);
//         setNewStatus(res.data.order.status);
//       })
//       .catch((err) => {
//         console.error(err);
//         toast.error("Failed to load order");
//         router.push("/dashboard/admin/orders");
//       })
//       .finally(() => setLoading(false));
//   }, [id]);

//   const updateStatus = async () => {
//     try {
//       await axios.put(
//         `/api/admin/orders/${id}`,
//         { status: newStatus },
//         { withCredentials: true }
//       );
//       toast.success("Order status updated");
//       setOrder((prev) => ({ ...prev, status: newStatus }));
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to update status");
//     }
//   };

//   if (loading) return <div className="p-5 text-center">Loading...</div>;
//   if (!order) return <div className="p-5 text-center">Order not found</div>;

//   return (
//     <div className="d-flex bg-light">
//       <Sidebar sidebarOpen={sidebarOpen} />

//       {/* Main content */}
//       <div
//         className="flex-grow-1"
//         style={{ marginLeft: sidebarOpen ? "220px" : "0", transition: "0.3s" }}
//       >
//         {/* Top navbar */}
//         <nav className="navbar navbar-expand-lg navbar-light bg-white px-4 shadow-sm sticky-top">
//           <button
//             className="btn btn-outline-primary me-3"
//             onClick={toggleSidebar}
//           >
//             ☰
//           </button>
//           <h5 className="mb-0 fw-semibold">Order Details</h5>
//           <div className="ms-auto d-flex align-items-center">
//             <FaBell className="me-3 text-muted" size={20} />
//             <div className="dropdown">
//               <button
//                 className="btn btn-outline-secondary dropdown-toggle"
//                 type="button"
//                 data-bs-toggle="dropdown"
//               >
//                 Admin
//               </button>
//               <ul className="dropdown-menu dropdown-menu-end">
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

//         <div className="p-4">
//           <div className="card border-0 shadow-sm p-4">
//             {/* Header section */}
//             <div className="d-flex justify-content-between align-items-center mb-4">
//               <div>
//                 <h4 className="fw-bold mb-0">Order #{order.orderNumber}</h4>
//                 <small className="text-muted">
//                   <FaCalendarAlt className="me-1" />
//                   {new Date(order.createdAt).toLocaleString()}
//                 </small>
//               </div>
//               <div>
//                 <span
//                   className={`badge px-3 py-2 fs-6 ${
//                     order.status === "Delivered"
//                       ? "bg-success"
//                       : order.status === "Shipped"
//                       ? "bg-info"
//                       : order.status === "Cancelled"
//                       ? "bg-danger"
//                       : "bg-warning text-dark"
//                   }`}
//                 >
//                   {order.status}
//                 </span>
//               </div>
//             </div>

//             {/* Customer & Shipping Details */}
//             <div className="row mb-4">
//               <div className="col-md-4">
//                 <h6 className="fw-semibold mb-2">
//                   <FaUser className="me-2 text-primary" />
//                   Customer
//                 </h6>
//                 <div>{order.user?.name}</div>
//                 <div>{order.user?.email}</div>
//                 <div>{order.user?.phone}</div>
//               </div>
//               <div className="col-md-4">
//                 <h6 className="fw-semibold mb-2">
//                   <FaTruck className="me-2 text-primary" />
//                   Shipping
//                 </h6>
//                 <div>{order.shipping?.name}</div>
//                 <div>{order.shipping?.phone}</div>
//                 <div>
//                   {order.shipping?.street}, {order.shipping?.city},{" "}
//                   {order.shipping?.state} - {order.shipping?.zip}
//                 </div>
//               </div>
//               <div className="col-md-4">
//                 <h6 className="fw-semibold mb-2">
//                   <FaCreditCard className="me-2 text-primary" />
//                   Payment
//                 </h6>
//                 <div>Method: {order.paymentMethod || "Not available"}</div>
//                 <div>Transaction ID: {order.transactionId || "—"}</div>
//                 <div>
//                   Paid:{" "}
//                   <span className="fw-semibold text-success">
//                     ₹{order.total}
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* Items Table */}
//             <h6 className="fw-semibold mb-3">
//               <FaBoxOpen className="me-2 text-primary" />
//               Order Items
//             </h6>
//             <div className="table-responsive">
//               <table className="table table-hover align-middle">
//                 <thead className="table-light">
//                   <tr>
//                     <th>Product</th>
//                     <th>Qty</th>
//                     <th>Price</th>
//                     <th>Subtotal</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {order.items?.map((it) => (
//                     <tr key={it._id}>
//                       <td>
//                         <div className="d-flex align-items-center">
//                           <img
//                             src={it.product?.mainImage || "/no-image.png"}
//                             alt={it.product?.name}
//                             width={55}
//                             height={55}
//                             className="rounded me-2"
//                             style={{ objectFit: "cover" }}
//                           />
//                           <div>
//                             <div className="fw-semibold">
//                               {it.product?.name}
//                             </div>
//                             <div className="text-muted small">
//                               ₹{it.price.toFixed(2)} each
//                             </div>
//                           </div>
//                         </div>
//                       </td>
//                       <td>{it.quantity}</td>
//                       <td>₹{it.price.toFixed(2)}</td>
//                       <td>
//                         ₹{(it.price * it.quantity).toFixed(2)}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {/* Summary */}
//             <div className="d-flex justify-content-end mt-4">
//               <div className="text-end">
//                 <div>
//                   Subtotal: ₹
//                   {order.subtotal?.toFixed(2) || (order.total * 0.9).toFixed(2)}
//                 </div>
//                 <div>Shipping: ₹{order.shippingCost || 0}</div>
//                 <h5 className="fw-bold mt-2">
//                   Total: ₹{order.total.toFixed(2)}
//                 </h5>
//               </div>
//             </div>

//             {/* Status update */}
//             <div className="mt-4 pt-3 border-top">
//               <h6 className="fw-semibold mb-2">Update Order Status</h6>
//               <div className="d-flex">
//                 <select
//                   value={newStatus}
//                   onChange={(e) => setNewStatus(e.target.value)}
//                   className="form-select w-auto me-3"
//                 >
//                   <option value="Pending">Pending</option>
//                   <option value="Confirmed">Confirmed</option>
//                   <option value="Shipped">Shipped</option>
//                   <option value="Delivered">Delivered</option>
//                   <option value="Cancelled">Cancelled</option>
//                 </select>
//                 <button className="btn btn-primary" onClick={updateStatus}>
//                   Update Status
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FaBell,
  FaBoxOpen,
  FaUser,
  FaTruck,
  FaCalendarAlt,
  FaCreditCard,
} from "react-icons/fa";
import Sidebar from "@/components/admin-panel/Sidebar";
import DesignUploads from "@/components/admin-panel/DesignUploads";

export default function AdminOrderDetail() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    if (!id) return;
    axios
      .get(`/api/admin/orders/${id}`, { withCredentials: true })
      .then((res) => {
        setOrder(res.data.order);
        setNewStatus(res.data.order.status);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load order");
        router.push("/dashboard/admin/orders");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async () => {
    try {
      await axios.put(
        `/api/admin/orders/${id}`,
        { status: newStatus, remarks },
        { withCredentials: true }
      );
      toast.success("Order status updated");
      setOrder((prev) => ({ ...prev, status: newStatus }));
      setRemarks("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  if (loading) return <div className="p-5 text-center">Loading...</div>;
  if (!order) return <div className="p-5 text-center">Order not found</div>;

  return (
    <div className="d-flex bg-light">
      <Sidebar sidebarOpen={sidebarOpen} />

      {/* Main content */}
      <div
        className="main-area"
        
      >
        {/* Top navbar */}
        <nav className="navbar navbar-expand-lg navbar-light bg-white px-4 shadow-sm sticky-top">
          <button
            className="btn btn-outline-primary me-3"
            onClick={toggleSidebar}
          >
            ☰
          </button>
          <h5 className="dashboard-main-h">Order Details</h5>
          <div className="ms-auto d-flex align-items-center">
            <FaBell className="me-3 text-muted" size={20} />
            <div className="dropdown">
              <button
                className="btn btn-outline-secondary dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
              >
                Admin
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <Link className="dropdown-item" href="#">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" href="#">
                    Logout
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        <div className="p-4">
          <div className="card border-0 shadow-sm p-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h4 className="fw-bold mb-0">Order #{order.orderNumber}</h4>
                <small className="text-muted">
                  <FaCalendarAlt className="me-1" />
                  {new Date(order.createdAt).toLocaleString()}
                </small>
              </div>
              <div>
                <span
                  className={`badge px-3 py-2 fs-6 ${
                    order.status === "Order Delivered"
                      ? "bg-success"
                      : order.status === "Design Rejected"
                      ? "bg-danger"
                      : order.status === "Order Dispatched"
                      ? "bg-info"
                      : "bg-warning text-dark"
                  }`}
                >
                  {order.status}
                </span>

                {order.status === "Design Rejected" && order.remarks && (
                  <div className="alert alert-danger mt-3 py-2 px-3">
                    <strong>Reason for Rejection:</strong> {order.remarks}
                  </div>
                )}
              </div>
            </div>

            {order.customerRemarks && (
              <div className="alert alert-info mt-3">
                <strong>Customer Special Remarks:</strong>
                <br />
                {order.customerRemarks}
              </div>
            )}

            {/* Customer & Shipping */}
            <div className="row mb-4">
              <div className="col-md-4">
                <h6 className="fw-semibold mb-2">
                  <FaUser className="me-2 text-primary" />
                  Customer
                </h6>
                <div>{order.user?.name}</div>
                <div>{order.user?.email}</div>
                <div>{order.user?.phone}</div>
              </div>
              <div className="col-md-4">
                <h6 className="fw-semibold mb-2">
                  <FaTruck className="me-2 text-primary" />
                  Shipping
                </h6>
                <div>{order.shipping?.name}</div>
                <div>{order.shipping?.phone}</div>
                <div>
                  {order.shipping?.street}, {order.shipping?.city},{" "}
                  {order.shipping?.state} - {order.shipping?.zip}
                </div>
              </div>
              <div className="col-md-4">
                <h6 className="fw-semibold mb-2">
                  <FaCreditCard className="me-2 text-primary" />
                  Payment
                </h6>
                <div>Method: {order.paymentMethod || "Not available"}</div>
                <div>Transaction ID: {order.transactionId || "—"}</div>
                <div>
                  Paid:{" "}
                  <span className="fw-semibold text-success">
                    ₹{order.total}
                  </span>
                </div>
              </div>
            </div>

            <DesignUploads
              productId={
                order.items?.[0]?.product?._id || order.items?.[0]?.product
              }
            />
            {/* <DesignUploads
                productId={order?.product?._id || order?.productId}
                userId={order?.user?._id || order?.userId}
              /> */}

            {order.reuploadedFiles?.length > 0 && (
              <div className="alert alert-info mt-3">
                <strong>Re-uploaded Designs:</strong>
                <ul className="mt-2">
                  {order.reuploadedFiles.map((f, i) => (
                    <li key={i}>
                      <a href={f.fileUrl} target="_blank" rel="noreferrer">
                        Download Re-uploaded File {i + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Items Table */}
            <h6 className="fw-semibold mb-3">
              <FaBoxOpen className="me-2 text-primary" />
              Order Items
            </h6>
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((it) => (
                    <tr key={it._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img
                            src={it.product?.mainImage || "/no-image.png"}
                            alt={it.product?.name}
                            width={55}
                            height={55}
                            className="rounded me-2"
                            style={{ objectFit: "cover" }}
                          />
                          <div>
                            <div className="fw-semibold">
                              {it.product?.name}
                            </div>
                            <div className="text-muted small">
                              ₹{it.price.toFixed(2)} each
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{it.quantity}</td>
                      <td>₹{it.price.toFixed(2)}</td>
                      <td>₹{(it.price * it.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="d-flex justify-content-end mt-4">
              <div className="text-end">
                <div>
                  Subtotal: ₹
                  {order.subtotal?.toFixed(2) || (order.total * 0.9).toFixed(2)}
                </div>
                <div>Shipping: ₹{order.shippingCost || 0}</div>
                <h5 className="fw-bold mt-2">
                  Total: ₹{order.total.toFixed(2)}
                </h5>
              </div>
            </div>

            {order.status === "Order Ready" && (
              <div className="alert alert-warning my-3">
                <strong>Dispatch Request:</strong>{" "}
                {order.dispatchRequest === "pending"
                  ? "Customer Requested Dispatch"
                  : "Waiting for customer request"}
              </div>
            )}

            {order.dispatchRequest === "approved" && (
              <div className="alert alert-success my-3">
                Dispatch request approved — Order is dispatched
              </div>
            )}

            {/* Status update */}
            <div className="mt-4 pt-3 border-top">
              <h6 className="fw-semibold mb-2">Update Order Status</h6>
              <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="form-select w-auto"
                >
                  <option value="Order Received">Order Received</option>
                  <option value="Design Approved">Design Approved</option>
                  <option value="Design Rejected">Design Rejected</option>
                  <option value="In Progress">In Progress</option>
                  <option value="In Packaging">In Packaging</option>
                  {/* NEW */}
                  <option value="Order Ready">Order Ready</option>
                  <option value="Order Dispatched">Order Dispatched</option>
                  <option value="Order Delivered">Order Delivered</option>
                </select>
                {/* 
                {newStatus === "Design Rejected" && (
                  <inputx
                    type="text"
                    placeholder="Enter rejection remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="form-control w-100 w-md-auto"
                  />
                )} */}

                {newStatus === "Design Rejected" && (
                  <input
                    type="text"
                    placeholder="Enter rejection remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="form-control w-100 w-md-auto"
                  />
                )}

                <button className="btn btn-primary" onClick={updateStatus}>
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
