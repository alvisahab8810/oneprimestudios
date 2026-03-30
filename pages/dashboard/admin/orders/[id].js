// pages/dashboard/admin/orders/[id].js
// FIX: Pass the full order item to DesignUploads instead of productId+orderId.
// Files now read directly from order.items[].uploadedAttributeFiles
// which is already saved correctly in the Order document.
// This fixes:
//   1. Files not showing (was querying DesignUpload collection with missing orderId)
//   2. Files mixing across orders (was querying by productId only)
// Everything else — status update, delivery challan, layout — unchanged.

"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FaBell, FaBoxOpen, FaUser, FaTruck, FaCalendarAlt, FaCreditCard } from "react-icons/fa";
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

  const [deliveryRemarks, setDeliveryRemarks] = useState("");
  const [challanFile, setChallanFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  const handleDeliveryUpload = async () => {
    if (!challanFile) { toast.error("Please upload delivery challan"); return; }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("challan", challanFile);
      formData.append("remarks", deliveryRemarks);
      const res = await axios.post(`/api/admin/orders/${id}/delivery`, formData, { withCredentials: true });
      toast.success("Delivery details saved");
      setOrder(res.data.order);
      setDeliveryRemarks("");
      setChallanFile(null);
    } catch (err) {
      toast.error("Failed to upload delivery details");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-5 text-center">Loading...</div>;
  if (!order) return <div className="p-5 text-center">Order not found</div>;

  return (
    <div className="d-flex bg-light">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        {/* Navbar */}
        <nav className="navbar navbar-expand-lg navbar-light bg-white px-4 shadow-sm sticky-top">
          <button className="btn btn-outline-primary me-3" onClick={toggleSidebar}>☰</button>
          <h5 className="dashboard-main-h">Order Details</h5>
          <div className="ms-auto d-flex align-items-center">
            <FaBell className="me-3 text-muted" size={20} />
            <div className="dropdown">
              <button className="btn btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">Admin</button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><Link className="dropdown-item" href="#">Profile</Link></li>
                <li><Link className="dropdown-item" href="#">Logout</Link></li>
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
                <span className={`badge px-3 py-2 fs-6 ${
                  order.status === "Order Delivered" ? "bg-success"
                  : order.status === "Design Rejected" ? "bg-danger"
                  : order.status === "Order Dispatched" ? "bg-info"
                  : "bg-warning text-dark"
                }`}>
                  {order.status}
                </span>
                {order.status === "Design Rejected" && order.remarks && (
                  <div className="alert alert-danger mt-3 py-2 px-3">
                    <strong>Reason for Rejection:</strong> {order.remarks}
                  </div>
                )}
                {order.status === "Cancelled" && order.paymentStatus === "REFUNDED" && (
                  <div className="alert alert-success mt-2 py-1 px-3" style={{ fontSize: 13 }}>
                    ✅ Wallet refund of <strong>₹{order.total}</strong> issued
                    {order.refundedAt && <> on {new Date(order.refundedAt).toLocaleString("en-IN")}</>}
                  </div>
                )}
                {order.status === "Cancelled" && order.paymentMethod === "Razorpay" && (
                  <div className="alert alert-warning mt-2 py-1 px-3" style={{ fontSize: 13 }}>
                    ℹ Razorpay payment — manual refund required via Razorpay dashboard.
                  </div>
                )}
              </div>
            </div>

            {order.customerRemarks && (
              <div className="alert alert-info mt-3">
                <strong>Customer Special Remarks:</strong><br />
                {order.customerRemarks}
              </div>
            )}

            {/* Customer, Shipping, Payment */}
            <div className="row mb-4">
              <div className="col-md-4">
                <h6 className="fw-semibold mb-2"><FaUser className="me-2 text-primary" />Customer</h6>
                <div>{order.user?.name}</div>
                <div>{order.user?.email}</div>
                <div>{order.user?.phone}</div>
              </div>
              <div className="col-md-4">
                <h6 className="fw-semibold mb-2"><FaTruck className="me-2 text-primary" />Shipping</h6>
                <div>{order.shipping?.name}</div>
                <div>{order.shipping?.phone}</div>
                <div>{order.shipping?.street}, {order.shipping?.city}, {order.shipping?.state} - {order.shipping?.zip}</div>
              </div>
              <div className="col-md-4">
                <h6 className="fw-semibold mb-2"><FaCreditCard className="me-2 text-primary" />Payment</h6>
                <div>Method: {order.paymentMethod || "Not available"}</div>
                <div>Transaction ID: {order.transactionId || "—"}</div>
                <div>Paid: <span className="fw-semibold text-success">₹{order.total}</span></div>
              </div>
            </div>

            {/* ── DESIGN FILES — FIX ──────────────────────────────────────────
                OLD: <DesignUploads productId={...} orderId={...} />
                     → queried DesignUpload collection → orderId never saved → empty
                     → also showed ALL users' files for that product

                NEW: <DesignUploads item={item} />
                     → reads directly from order.items[i].uploadedAttributeFiles
                     → guaranteed to show ONLY files for THIS order item
                     → no DB query needed at all
            ─────────────────────────────────────────────────────────────── */}
            <h6 className="fw-semibold mb-3">Uploaded Design Files</h6>
            {order.items.map((item, idx) => (
              <div key={idx} className="border rounded p-3 mb-3 bg-white">
                <div className="d-flex align-items-center gap-2 mb-2">
                  {item.product?.mainImage && (
                    <img src={item.product.mainImage} alt={item.product?.name} width={40} height={40} style={{ objectFit: "cover", borderRadius: 6 }} />
                  )}
                  <strong>{item.product?.name}</strong>
                  <span className="text-muted small">Qty: {item.quantity}</span>
                </div>

                {/* Pass the whole item — component reads uploadedAttributeFiles + uploadedFiles from it */}
                <DesignUploads item={item} />
              </div>
            ))}

            {/* Re-uploaded files — show only the latest */}
            {order.reuploadedFiles?.length > 0 && (() => {
              const latest = order.reuploadedFiles[order.reuploadedFiles.length - 1];
              return (
                <div className="alert alert-info mt-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <strong>Latest Re-uploaded Design</strong>
                    {latest.uploadedAt && (
                      <span className="text-muted ms-2" style={{ fontSize: 12 }}>
                        — {new Date(latest.uploadedAt).toLocaleString("en-IN")}
                      </span>
                    )}
                    {order.reuploadedFiles.length > 1 && (
                      <span className="badge bg-secondary ms-2">{order.reuploadedFiles.length} uploads total</span>
                    )}
                  </div>
                  <a href={latest.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                    Download File
                  </a>
                </div>
              );
            })()}

            {/* Items Table — unchanged */}
            <h6 className="fw-semibold mb-3 mt-4">
              <FaBoxOpen className="me-2 text-primary" />Order Items
            </h6>
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                  {order.items?.map((it) => (
                    <tr key={it._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img src={it.product?.mainImage || "/no-image.png"} alt={it.product?.name} width={55} height={55} className="rounded me-2" style={{ objectFit: "cover" }} />
                          <div>
                            <div className="fw-semibold">{it.product?.name}</div>
                            <div className="text-muted small">₹{it.price.toFixed(2)} each</div>
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
                <div>Subtotal: ₹{order.subtotal?.toFixed(2) || (order.total * 0.9).toFixed(2)}</div>
                {order.coupon?.discountAmount > 0 && (
                  <div className="text-success">Discount ({order.coupon.code}): − ₹{order.coupon.discountAmount.toFixed(2)}</div>
                )}
                {(order.gstAmount || 0) > 0 && (
                  <div className="text-muted">GST: ₹{order.gstAmount.toFixed(2)}</div>
                )}
                <h5 className="fw-bold mt-2">Total: ₹{order.total.toFixed(2)}</h5>
              </div>
            </div>

            {order.status === "Order Ready" && (
              <div className="alert alert-warning my-3">
                <strong>Dispatch Request:</strong>{" "}
                {order.dispatchRequest === "pending" ? "Customer Requested Dispatch" : "Waiting for customer request"}
              </div>
            )}
            {order.dispatchRequest === "approved" && (
              <div className="alert alert-success my-3">Dispatch request approved — Order is dispatched</div>
            )}

            {/* Delivery Challan — unchanged */}
            {(order.status === "Order Dispatched" || order.status === "Order Delivered") && (
              <div className="card mt-4 border shadow-sm">
                <div className="card-body">
                  <h6 className="fw-semibold mb-3"><FaTruck className="me-2 text-success" />Delivery Challan & Remarks</h6>
                  {order.deliveryChallan?.fileUrl && (
                    <div className="alert alert-success py-2">
                      <strong>Challan Uploaded:</strong>{" "}
                      <a href={order.deliveryChallan.fileUrl} target="_blank" rel="noreferrer">Download Delivery Challan</a>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label">Upload Delivery Challan</label>
                    <input type="file" accept=".pdf,.jpg,.png" className="form-control" onChange={(e) => setChallanFile(e.target.files[0])} />
                    <small className="text-muted">Allowed formats: PDF, JPG, PNG</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Delivery Remarks (Visible to B2B)</label>
                    <textarea className="form-control" rows={3} value={deliveryRemarks} onChange={(e) => setDeliveryRemarks(e.target.value)} placeholder="Example: Delivered at warehouse gate, signed by Mr. Khan" />
                  </div>
                  <button className="btn btn-success" disabled={uploading} onClick={handleDeliveryUpload}>
                    {uploading ? "Uploading..." : "Save & Notify B2B User"}
                  </button>
                </div>
              </div>
            )}

            {/* Status Update — unchanged */}
            <div className="mt-4 pt-3 border-top">
              <h6 className="fw-semibold mb-2">Update Order Status</h6>
              <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="form-select w-auto">
                  <option value="Order Received">Order Received</option>
                  <option value="Design Approved">Design Approved</option>
                  <option value="Design Rejected">Design Rejected</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Order Ready">Order Ready</option>
                  <option value="In Packaging">In Packaging</option>
                  <option value="Order Dispatched">Order Dispatched</option>
                  <option value="Order Delivered">Order Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                {newStatus === "Cancelled" && (
                  <div className="alert alert-warning py-1 px-2 mb-0" style={{ fontSize: 12 }}>
                    ⚠ If paid via Wallet, the amount will be instantly refunded to the customer.
                  </div>
                )}
                {newStatus === "Design Rejected" && (
                  <input type="text" placeholder="Enter rejection remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="form-control w-100 w-md-auto" />
                )}
                <button className="btn btn-primary" onClick={updateStatus}>Update Status</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



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
// } from "react-icons/fa";
// import Sidebar from "@/components/admin-panel/Sidebar";
// import DesignUploads from "@/components/admin-panel/DesignUploads";

// export default function AdminOrderDetail() {
//   const params = useParams();
//   const id = params?.id;
//   const router = useRouter();

//   const [order, setOrder] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [newStatus, setNewStatus] = useState("");
//   const [remarks, setRemarks] = useState("");
//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   // Delivery Challa Remarks

//   const [deliveryRemarks, setDeliveryRemarks] = useState("");
//   const [challanFile, setChallanFile] = useState(null);
//   const [uploading, setUploading] = useState(false);


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
//         { status: newStatus, remarks },
//         { withCredentials: true }
//       );
//       toast.success("Order status updated");
//       setOrder((prev) => ({ ...prev, status: newStatus }));
//       setRemarks("");
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to update status");
//     }
//   };



//   // For Delivery Challan 
//   const handleDeliveryUpload = async () => {
//   if (!challanFile) {
//     toast.error("Please upload delivery challan");
//     return;
//   }

//   try {
//     setUploading(true);

//     const formData = new FormData();
//     formData.append("challan", challanFile);
//     formData.append("remarks", deliveryRemarks);

//     const res = await axios.post(
//       `/api/admin/orders/${id}/delivery`,
//       formData,
//       { withCredentials: true }
//     );

//     toast.success("Delivery details saved");

//     setOrder(res.data.order);
//     setDeliveryRemarks("");
//     setChallanFile(null);
//   } catch (err) {
//     toast.error("Failed to upload delivery details");
//   } finally {
//     setUploading(false);
//   }
// };



//   if (loading) return <div className="p-5 text-center">Loading...</div>;
//   if (!order) return <div className="p-5 text-center">Order not found</div>;

//   return (
//     <div className="d-flex bg-light">
//       <Sidebar sidebarOpen={sidebarOpen} />

//       {/* Main content */}
//       <div
//         className="main-area"
        
//       >
//         {/* Top navbar */}
//         <nav className="navbar navbar-expand-lg navbar-light bg-white px-4 shadow-sm sticky-top">
//           <button
//             className="btn btn-outline-primary me-3"
//             onClick={toggleSidebar}
//           >
//             ☰
//           </button>
//           <h5 className="dashboard-main-h">Order Details</h5>
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
//             {/* Header */}
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
//                     order.status === "Order Delivered"
//                       ? "bg-success"
//                       : order.status === "Design Rejected"
//                       ? "bg-danger"
//                       : order.status === "Order Dispatched"
//                       ? "bg-info"
//                       : "bg-warning text-dark"
//                   }`}
//                 >
//                   {order.status}
//                 </span>

//                 {order.status === "Design Rejected" && order.remarks && (
//                   <div className="alert alert-danger mt-3 py-2 px-3">
//                     <strong>Reason for Rejection:</strong> {order.remarks}
//                   </div>
//                 )}
//               </div>
//             </div>

//             {order.customerRemarks && (
//               <div className="alert alert-info mt-3">
//                 <strong>Customer Special Remarks:</strong>
//                 <br />
//                 {order.customerRemarks}
//               </div>
//             )}

//             {/* Customer & Shipping */}
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

//             {/* <DesignUploads
//               productId={
//                 order.items?.[0]?.product?._id || order.items?.[0]?.product
//               }
//             /> */}


 
//          <h6 className="fw-semibold mb-3">Uploaded Designs</h6>

//         {order.items.map((item, idx) => (
//   <div key={idx} className="border rounded p-3 mb-3 bg-white">
//     <strong>{item.product?.name}</strong>

//     <DesignUploads
//       productId={item.product?._id}
//       orderId={order._id}
//     />

//   </div>
// ))}


          

//             {order.reuploadedFiles?.length > 0 && (
//               <div className="alert alert-info mt-3">
//                 <strong>Re-uploaded Designs:</strong>
//                 <ul className="mt-2">
//                   {order.reuploadedFiles.map((f, i) => (
//                     <li key={i}>
//                       <a href={f.fileUrl} target="_blank" rel="noreferrer">
//                         Download Re-uploaded File {i + 1}
//                       </a>
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             )}

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
//                       <td>₹{(it.price * it.quantity).toFixed(2)}</td>
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

//             {order.status === "Order Ready" && (
//               <div className="alert alert-warning my-3">
//                 <strong>Dispatch Request:</strong>{" "}
//                 {order.dispatchRequest === "pending"
//                   ? "Customer Requested Dispatch"
//                   : "Waiting for customer request"}
//               </div>
//             )}

//             {order.dispatchRequest === "approved" && (
//               <div className="alert alert-success my-3">
//                 Dispatch request approved — Order is dispatched
//               </div>
//             )}


//             {/* Delivery Challan Area  */}

//             {(order.status === "Order Dispatched" ||
//   order.status === "Order Delivered") && (
//   <div className="card mt-4 border shadow-sm">
//     <div className="card-body">
//       <h6 className="fw-semibold mb-3">
//         <FaTruck className="me-2 text-success" />
//         Delivery Challan & Remarks
//       </h6>

//       {/* If already uploaded */}
//       {order.deliveryChallan?.fileUrl && (
//         <div className="alert alert-success py-2">
//           <strong>Challan Uploaded:</strong>{" "}
//           <a
//             href={order.deliveryChallan.fileUrl}
//             target="_blank"
//             rel="noreferrer"
//           >
//             Download Delivery Challan
//           </a>
//         </div>
//       )}

//             {/* Upload */}
//             <div className="mb-3">
//               <label className="form-label">Upload Delivery Challan</label>
//               <input
//                 type="file"
//                 accept=".pdf,.jpg,.png"
//                 className="form-control"
//                 onChange={(e) => setChallanFile(e.target.files[0])}
//               />
//               <small className="text-muted">
//                 Allowed formats: PDF, JPG, PNG
//               </small>
//             </div>

//             {/* Remarks */}
//             <div className="mb-3">
//               <label className="form-label">Delivery Remarks (Visible to B2B)</label>
//               <textarea
//                 className="form-control"
//                 rows={3}
//                 value={deliveryRemarks}
//                 onChange={(e) => setDeliveryRemarks(e.target.value)}
//                 placeholder="Example: Delivered at warehouse gate, signed by Mr. Khan"
//               />
//             </div>

//             <button
//               className="btn btn-success"
//               disabled={uploading}
//               onClick={handleDeliveryUpload}
//             >
//               {uploading ? "Uploading..." : "Save & Notify B2B User"}
//             </button>
//           </div>
//         </div>
//       )}


//             {/* Status update */}
//             <div className="mt-4 pt-3 border-top">
//               <h6 className="fw-semibold mb-2">Update Order Status</h6>
//               <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
//                 <select
//                   value={newStatus}
//                   onChange={(e) => setNewStatus(e.target.value)}
//                   className="form-select w-auto"
//                 >
//                   <option value="Order Received">Order Received</option>
//                   <option value="Design Approved">Design Approved</option>
//                   <option value="Design Rejected">Design Rejected</option>
//                   <option value="In Progress">In Progress</option>
                  
//                   {/* NEW */}
//                   <option value="Order Ready">Order Ready</option>
//                   <option value="In Packaging">In Packaging</option>
//                   <option value="Order Dispatched">Order Dispatched</option>
//                   <option value="Order Delivered">Order Delivered</option>
//                 </select>
           

//                 {newStatus === "Design Rejected" && (
//                   <input
//                     type="text"
//                     placeholder="Enter rejection remarks"
//                     value={remarks}
//                     onChange={(e) => setRemarks(e.target.value)}
//                     className="form-control w-100 w-md-auto"
//                   />
//                 )}

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
