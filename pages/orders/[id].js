// "use client";
// import { useEffect, useState } from "react";
// import { useRouter, useParams } from "next/navigation";
// import axios from "axios";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import { toast } from "react-hot-toast";

// export default function OrderDetailPage() {
//   const router = useRouter();
//   const { id } = useParams();
//   const [order, setOrder] = useState(null);

//   useEffect(() => {
//     if (!id) return;

//     const loadOrder = async () => {
//       try {
//         const token =
//           typeof window !== "undefined" ? localStorage.getItem("token") : null;

//         let res;
//         if (token) {
//           res = await axios.get(`/api/orders/${id}`, {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//         } else {
//           res = await axios.get(`/api/orders/${id}`, { withCredentials: true });
//         }

//         setOrder(res.data.order);
//       } catch (err) {
//         console.error("❌ Failed to load order:", err.response?.data || err.message);
//         toast.error("Failed to load order");
//         router.push("/orders");
//       }
//     };

//     loadOrder();
//   }, [id]);

//   if (!order)
//     return (
//       <div className="d-flex justify-content-center align-items-center vh-100">
//         <div className="spinner-border primary-c" role="status">
//           <span className="visually-hidden">Loading...</span>
//         </div>
//       </div>
//     );

//   return (
//     <>
//      <div className="container">
//        <Topbar />
//      </div>

//       <div className="container py-5">
//         <div className="d-flex justify-content-between align-items-center mb-4">
//           <h3 className="fw-bold mb-0">
//             Order #{order.orderNumber || id.slice(-6)}
//           </h3>
//           <span
//             className={`badge px-3 py-2 fs-6 ${
//               order.status === "Delivered"
//                 ? "bg-success"
//                 : order.status === "Shipped"
//                 ? "bg-info text-dark"
//                 : order.status === "Cancelled"
//                 ? "bg-danger"
//                 : "bg-warning text-dark"
//             }`}
//           >
//             {order.status}
//           </span>
//         </div>

//         <div className="row g-4">
//           {/* Shipping Details */}
//           <div className="col-lg-4">
//             <div className="card shadow-sm border-0 h-100">
//               <div className="card-body">
//                 <h5 className="fw-bold mb-3 primary-c">Shipping Details</h5>
//                 <p className="mb-1 fw-semibold">{order.shipping?.name}</p>
//                 <p className="mb-1">{order.shipping?.phone}</p>
//                 <p className="text-muted small mb-0">
//                   {order.shipping?.street}, {order.shipping?.city},{" "}
//                   {order.shipping?.state} - {order.shipping?.zip}
//                 </p>
//               </div>
//             </div>
//           </div>

//           {/* Items List */}
//           <div className="col-lg-8">
//             <div className="card shadow-sm border-0 h-100">
//               <div className="card-body">
//                 <h5 className="fw-bold mb-3 primary-c">Order Items</h5>
//                 {order.items.length > 0 ? (
//                   order.items.map((it) => (
//                     <div
//                       key={it._id}
//                       className="d-flex align-items-center border-bottom py-3"
//                     >
//                       <img
//                         src={it.product?.mainImage || "/no-image.png"}
//                         width={80}
//                         height={80}
//                         className="rounded"
//                         style={{ objectFit: "cover" }}
//                       />
//                       <div className="ms-3 flex-grow-1">
//                         <h6 className="mb-1 fw-semibold">
//                           {it.product?.name || it.product}
//                         </h6>
//                         <p className="small text-muted mb-0">
//                           Qty: {it.quantity} × ₹{it.price}
//                         </p>
//                       </div>
//                       <div className="fw-bold text-end text-success">
//                         ₹{it.quantity * it.price}
//                       </div>
//                     </div>
//                   ))
//                 ) : (
//                   <p className="text-muted text-center my-4">
//                     No items found in this order.
//                   </p>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Order Summary */}
//         <div className="card shadow-sm border-0 mt-4">
//           <div className="card-body">
//             <h5 className="fw-bold primary-c mb-3">Order Summary</h5>
//             <div className="row">
//               <div className="col-md-6">
//                 <p className="mb-1">
//                   <span className="fw-semibold">Subtotal:</span> ₹
//                   {order.subtotal || order.total}
//                 </p>
//                 {order.discount > 0 && (
//                   <p className="mb-1 text-success">
//                     <span className="fw-semibold">Discount:</span> -₹
//                     {order.discount}
//                   </p>
//                 )}
//                 <p className="mb-1">
//                   <span className="fw-semibold">Shipping:</span> ₹
//                   {order.shippingCost || 0}
//                 </p>
//               </div>
//               <div className="col-md-6 text-md-end">
//                 <h5 className="fw-bold text-dark mb-0">
//                   Total: ₹{order.total}
//                 </h5>
//                 <p className="text-muted small mb-0">
//                   Payment Method: {order.paymentMethod || "—"}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Back to Orders Button */}
//         <div className="text-center mt-4">
//           <button
//             onClick={() => router.push("/orders")}
//             className="btn btn-outline-primary px-4"
//           >
//             ← Back to My Orders
//           </button>
//         </div>
//       </div>

//       <Footer />
//     </>
//   );
// }

// "use client";
// import { useEffect, useState } from "react";
// import { useRouter, useParams } from "next/navigation";
// import axios from "axios";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import { toast } from "react-hot-toast";

// export default function OrderDetailPage() {
//   const router = useRouter();
//   const { id } = useParams();
//   const [order, setOrder] = useState(null);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [loading, setLoading] = useState(false);

//   // Load order
//   useEffect(() => {
//     if (!id) return;
//     const loadOrder = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get(`/api/orders/${id}`, {
//           headers: token ? { Authorization: `Bearer ${token}` } : {},
//           withCredentials: true,
//         });
//         setOrder(res.data.order);

//         // detect admin type (basic example)
//         if (res.data.user?.role === "admin" || localStorage.getItem("admin_auth"))
//           setIsAdmin(true);
//       } catch (err) {
//         console.error("❌ Failed to load order:", err.response?.data || err.message);
//         toast.error("Failed to load order");
//         router.push("/orders");
//       }
//     };
//     loadOrder();
//   }, [id]);

//   // Update status (admin only)
//   const updateStatus = async (newStatus) => {
//     try {
//       setLoading(true);
//       const res = await axios.put(`/api/admin/orders/${id}`, { status: newStatus });
//       setOrder(res.data.order);
//       toast.success("Order status updated!");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to update status");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (!order)
//     return (
//       <div className="d-flex justify-content-center align-items-center vh-100">
//         <div className="spinner-border primary-c" role="status" />
//       </div>
//     );

//   return (
//     <>
//       <div className="container">
//         <Topbar />
//       </div>

//       <div className="container py-5">
//         <div className="d-flex justify-content-between align-items-center mb-4">
//           <h3 className="fw-bold mb-0">
//             Order #{order.orderNumber || id.slice(-6)}
//           </h3>
//           <div className="d-flex align-items-center gap-3">
//             <span
//               className={`badge px-3 py-2 fs-6 ${
//                 order.status === "Delivered"
//                   ? "bg-success"
//                   : order.status === "Shipped"
//                   ? "bg-info text-dark"
//                   : order.status === "Cancelled"
//                   ? "bg-danger"
//                   : "bg-warning text-dark"
//               }`}
//             >
//               {order.status}
//             </span>

//             {/* Admin: update status */}
//             {isAdmin && (
//               <select
//                 disabled={loading}
//                 className="form-select form-select-sm"
//                 value={order.status}
//                 onChange={(e) => updateStatus(e.target.value)}
//               >
//                 <option value="Pending">Pending</option>
//                 <option value="Processing">Processing</option>
//                 <option value="Shipped">Shipped</option>
//                 <option value="Delivered">Delivered</option>
//                 <option value="Cancelled">Cancelled</option>
//               </select>
//             )}
//           </div>
//         </div>

//         {/* Shipping + Items + Summary (same as your version) */}
//         {/* ... keep your nice layout here ... */}

//         <div className="text-center mt-4">
//           <button
//             onClick={() => router.push("/orders")}
//             className="btn btn-outline-primary px-4"
//           >
//             ← Back to My Orders
//           </button>
//         </div>
//       </div>

//       <Footer />
//     </>
//   );
// }

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import { toast } from "react-hot-toast";
import {
  FaBoxOpen,
  FaCalendarAlt,
  FaTruck,
  FaUser,
  FaCreditCard,
  FaMapMarkerAlt,
  FaFileInvoice,
} from "react-icons/fa";
import Offcanvas from "@/components/header/Offcanvas";

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);


  const sendDispatchRequest = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await axios.post(
      `/api/orders/dispatch-request/${order._id}`,
      {},
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );

    toast.success("Dispatch request sent!");
    // reload page
    window.location.reload();
  } catch (err) {
    toast.error(
      err.response?.data?.message || "Failed to send dispatch request"
    );
  }
};


  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/orders/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });
        setOrder(res.data.order);
      } catch (err) {
        console.error("❌ Order fetch error:", err);
        toast.error("Failed to load order details");
        router.push("/orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, router]);

  if (loading)
    return (
      <div className="cart-loader-wrapper">
        <div className="cart-loader-box">
          <div className="cart-loader-animation"></div>

          <h4 className="cart-loader-text">Loading your cart...</h4>
        </div>

        <style jsx>{`
          .cart-loader-wrapper {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f7f9fc;
          }

          .cart-loader-box {
            text-align: center;
            animation: fadeIn 0.6s ease-out;
          }

          .cart-loader-animation {
            width: 70px;
            height: 70px;
            margin: 0 auto 20px;
            border-radius: 50%;
            border: 6px solid #d9d9ff;
            border-top-color: #6a5cff;
            border-right-color: #6a5cff;
            animation: cart-spin 1s linear infinite,
              pulse 1.5s ease-in-out infinite;
            box-shadow: 0 0 20px rgba(106, 92, 255, 0.3);
          }

          @keyframes cart-spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes pulse {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.15);
            }
            100% {
              transform: scale(1);
            }
          }

          .cart-loader-text {
            font-size: 18px;
            font-weight: 600;
            color: #555;
            letter-spacing: 0.3px;
            animation: blinkFade 1.6s infinite ease-in-out;
          }

          @keyframes blinkFade {
            0% {
              opacity: 0.7;
            }
            50% {
              opacity: 1;
            }
            100% {
              opacity: 0.7;
            }
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Mobile responsive */
          @media (max-width: 480px) {
            .cart-loader-animation {
              width: 55px;
              height: 55px;
            }
            .cart-loader-text {
              font-size: 16px;
            }
          }
        `}</style>
      </div>
    );

  if (!order)
    return (
      <div className="text-center py-5">
        <h5>Order not found</h5>
      </div>
    );

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Delivered":
      case "Order Delivered":
        return "bg-success";
      case "Shipped":
      case "Order Dispatched":
        return "bg-info text-dark";
      case "Processing":
      case "In Progress":
        return "bg-warning text-dark";
      case "Cancelled":
      case "Design Rejected":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  };

  return (
    <div className="order-details-area">
      <Topbar />
      <Offcanvas />

      <div className="container  padding-top-40">
        {/* HEADER */}
        <div className="card mb-4 p-4">
          <div className="d-flex justify-content-between gap-3 ">
            <div>
              <h4 className="fw-bold mb-2">
                <FaFileInvoice className="me-2 primary-c" />
                Order #{order.orderNumber || id.slice(-6)}
              </h4>
              <small className="text-muted">
                <FaCalendarAlt className="me-1" />
                {new Date(order.createdAt).toLocaleString()}
              </small>
            </div>

            <div>
              <span
                className={`badge px-3 py-2 fs-6 ${getStatusBadgeClass(
                  order.status
                )}`}
              >
                {order.status}
              </span>

              {/* ✔ If order is READY — show button */}
                {order.status === "Order Ready" && order.dispatchRequest === "none" && (
                  <div className="mt-3">
                    <button className="track-order-btn" onClick={sendDispatchRequest}>
                      Send Dispatch Request
                    </button>
                  </div>
                )}

                {/* ✔ When request sent but admin has not approved yet */}
                {order.status === "Order Ready" && order.dispatchRequest === "pending" && (
                  <div className="alert alert-info mt-3">
                    Dispatch request sent. Waiting for admin approval.
                  </div>
                )}

                {/* ✔ When admin approves by marking "Order Dispatched" */}
                {order.dispatchRequest === "approved" && (
                  <div className="alert alert-success mt-3">
                    Your dispatch request has been approved.
                  </div>
                )}


              {/* ✅ Show rejection reason only when Design Rejected */}
              {order.status === "Design Rejected" && order.remarks && (
                <div className="mt-3 p-3 rounded border border-danger bg-light">
                  <h6 className="text-danger mb-1">
                    <FaBoxOpen className="me-2" />
                    Design Rejected
                  </h6>
                  <p className="mb-0">
                    <strong>Reason:</strong> {order.remarks}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push(`/track-order/${order._id}`)}
          className="track-order-btn"
        >
           Track Your Order
        </button>

        {/* SHIPPING + BILLING INFO */}
        <div className="card mb-4 p-4">
          <div className="row">
            <div className="col-md-6 mb-3 customer-details">
              <h6 className="fw-semibold mb-2">
                <FaUser className="me-2 primary-c" />
                Customer Details
              </h6>
              <p className="mb-1">
                <strong>Name:</strong>{" "}
                {order.shipping?.name || order.user?.name}
              </p>
              <p className="mb-1">
                <strong>Company:</strong>{" "}
                {order.shipping?.companyName || order.user?.companyName || "—"}
              </p>
              <p className="mb-1">
                <strong>GST Number:</strong>{" "}
                {order.shipping?.gstNumber || order.user?.gstNumber || "—"}
              </p>
              <p className="mb-1">
                <strong>Email:</strong> {order.user?.email}
              </p>
              <p className="mb-1">
                <strong>Phone:</strong>{" "}
                {order.shipping?.phone || order.user?.phone}
              </p>
            </div>

            <div className="col-md-6 mb-3">
              <h6 className="fw-semibold mb-2">
                <FaMapMarkerAlt className="me-2 primary-c" />
                Shipping Address
              </h6>
              <p className="mb-1">{order.shipping?.street}</p>
              <p className="mb-1">
                {order.shipping?.city}, {order.shipping?.state} -{" "}
                {order.shipping?.zip}
              </p>
              <p className="mb-1">
                <strong>Payment Method:</strong>{" "}
                {order.paymentMethod || "Cash on Delivery"}
              </p>
            </div>
          </div>
        </div>

        {/* ORDER ITEMS */}
        <div className="card mb-4 p-4">
          <h6 className="fw-semibold mb-3">
            <FaBoxOpen className="me-2 primary-c" />
            Ordered Items
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
                {order.items?.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div className="d-flex align-items-center">
                        <img
                          src={item.product?.mainImage || "/no-image.png"}
                          alt={item.product?.name}
                          width={60}
                          height={60}
                          className="rounded me-3"
                          style={{ objectFit: "cover" }}
                        />
                        <div>
                          <div className="fw-semibold product-name-area">
                            {item.product?.name || "Unnamed Product"}
                          </div>
                          <div className="text-muted small">
                            ₹{item.price.toFixed(2)} each
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{item.quantity}</td>
                    <td>₹{item.price.toFixed(2)}</td>
                    <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="summary-card card p-3">
          <h6 className="fw-semibold mb-3">
            <FaCreditCard className="me-2 primary-c" />
            Payment Summary
          </h6>
          <div className="d-flex justify-content-end">
            <div style={{ minWidth: "260px" }}>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <strong>
                  ₹{order.subtotal || (order.total * 0.9).toFixed(2)}
                </strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping:</span>
                <strong>₹{order.shippingCost || 0}</strong>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <span className="fw-semibold">Total:</span>
                <strong className="primary-c fs-5">₹{order.total}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* BACK BUTTON */}
        <div className="text-center mt-4 mb-4">
          <button
            onClick={() => router.push("/orders")}
            className="view-orders-btn"
          >
            ← Back to My Orders
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
