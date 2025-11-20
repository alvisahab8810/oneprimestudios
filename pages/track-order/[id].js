"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import {
  FaTruck,
  FaBoxOpen,
  FaHome,
  FaClipboardList,
  FaTimesCircle,
  FaCog,
  FaThumbsUp,
  FaPrint,
} from "react-icons/fa";
import Offcanvas from "@/components/header/Offcanvas";

export default function TrackOrderPage() {
  const router = useRouter();
  const { id } = router.query;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // canonical stages (order)
  const stages = [
    { title: "Pending", icon: <FaClipboardList /> },
    { title: "Processing", icon: <FaCog /> },
    { title: "In Progress", icon: <FaBoxOpen /> },
    { title: "Design Approved", icon: <FaThumbsUp /> },
    { title: "Printing", icon: <FaPrint /> },
    { title: "Shipped", icon: <FaTruck /> },
    { title: "Delivered", icon: <FaHome /> },
  ];

  // Normalize backend status into one of canonical stage titles
  function mapStatusToStage(rawStatus) {
    if (!rawStatus) return null;
    const s = String(rawStatus).trim().toLowerCase();

    // terminal states
    if (["cancelled", "canceled"].includes(s)) return "Cancelled";
    if (["rejected", "design rejected"].includes(s)) return "Rejected";

    // direct mappings & common aliases
    if (s.includes("deliv")) return "Delivered"; // delivered, order delivered
    if (s.includes("dispatch") || s.includes("shipp")) return "Shipped"; // shipped, order dispatched
    if (s.includes("print")) return "Printing";
    if (s.includes("design approved")) return "Design Approved";
    if (s.includes("in progress")) return "In Progress";
    if (s === "processing") return "Processing";
    if (s === "pending" || s.includes("received") || s.includes("order received") || s.includes("in packaging")) return "Pending";

    // some backends use 'order dispatched', 'order delivered', etc. handled above via includes
    // fallback: if it matches one of canonical titles loosely, return it:
    const found = stages.find((st) => st.title.toLowerCase() === s);
    if (found) return found.title;

    // unknown fallback: map to nearest sensible stage
    // if contains 'progress' use In Progress
    if (s.includes("progress")) return "In Progress";
    // else return Pending by default so user isn't left with empty bar
    return "Pending";
  }

  // fetch order repeatedly for near-real-time reflection
  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/orders/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: true,
        });
        if (!mounted) return;
        setOrder(res.data.order);
      } catch (error) {
        // if order not found or unauthorized, navigate back after toast
        console.error("Order fetch error:", error?.response?.data || error.message);
        toast.error("Failed to load order tracking");
        router.push("/orders");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 8000); // 8s polling
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [id, router]);

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border primary-c" />
      </div>
    );

  if (!order)
    return (
      <div className="text-center py-5">
        <h5>Order not found</h5>
      </div>
    );

  // compute current stage index using normalized mapping
  const mappedStage = mapStatusToStage(order.status);
  const currentStageIndex = stages.findIndex(
    (s) => s.title.toLowerCase() === (mappedStage || "").toLowerCase()
  );

  const isTerminal = ["Cancelled", "Rejected", "Design Rejected"].some(
    (t) => t.toLowerCase() === (order.status || "").toLowerCase()
  );

  // If status maps to terminal but not to any stage, show full bar
  const progressPercent =
    isTerminal
      ? 100
      : currentStageIndex >= 0
      ? ((currentStageIndex + 1) / stages.length) * 100
      : 0; // fallback 0 if unknown

  return (
    <div className="order-details-area">
      <Topbar />
      <Offcanvas/>
      <div className="container padding-top-40">
        {/* Header */}
        <div className="card  p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h5 className="fw-bold mb-1">Track Your Order</h5>
              <small className="text-muted">
                Order #{order.orderNumber} • Placed on{" "}
                {new Date(order.createdAt).toLocaleString()}
              </small>
            </div>

            <span
              className={`badge fs-6 px-3 py-2 ${
                isTerminal
                  ? "bg-danger"
                  : (mappedStage === "Delivered" || (order.status || "").toLowerCase().includes("deliver"))
                  ? "bg-success"
                  : "bg-brand"
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Tracking Progress */}
        <div className="card  p-4 mb-5">
          <h6 className="fw-semibold mb-4 primary-c tracking-margin">Tracking Progress</h6>

          {!isTerminal ? (
            <div className="timeline-container position-relative">
              <div className="progress-bar-bg" />
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
              <div className="timeline-steps d-flex justify-content-between">
                {stages.map((step, i) => {
                  const isCompleted = i <= currentStageIndex;
                  return (
                    <div key={i} className="text-center flex-fill px-2">
                      <div
                        className={`timeline-icon ${
                          isCompleted ? "completed" : ""
                        }`}
                        title={step.title}
                        aria-hidden
                      >
                        {step.icon}
                      </div>
                      <div
                        className={`timeline-title ${
                          isCompleted ? "primary-c fw-semibold" : "text-muted"
                        }`}
                      >
                        {step.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <FaTimesCircle size={50} className="text-danger mb-3" />
              <h5 className="text-danger fw-bold mb-2">{order.status}</h5>
              {order.remarks && <p className="text-muted">{order.remarks}</p>}
            </div>
          )}
        </div>

        {/* Customer & Shipping */}
        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="card  p-4">
              <h6 className="fw-semibold primary-c mb-2">Customer Details</h6>
              <p className="mb-1 fw-medium">{order.shipping?.name || order.user?.name}</p>
              <p className="mb-1">{order.shipping?.phone || order.user?.phone}</p>
              {order.user?.email && <p className="mb-0 text-muted">{order.user.email}</p>}
            </div>
          </div>

          <div className="col-md-6">
            <div className="card  p-4">
              <h6 className="fw-semibold primary-c mb-2">Shipping Address</h6>
              <p className="mb-0">{order.shipping?.street || order.shipping?.address || "—"}</p>
              <p className="mb-0">
                {order.shipping?.city || ""}{order.shipping?.city ? ", " : ""}{order.shipping?.state || ""}{" "}
                {order.shipping?.zip || ""}
              </p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="card  p-4">
          <h6 className="fw-semibold mb-3 primary-c">Order Summary</h6>
          {order.items?.map((item, i) => (
            <div key={i} className="d-flex justify-content-between mb-2">
              <span>{item.product?.name || "Product"} × {item.quantity}</span>
              <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
            </div>
          ))}
          <hr />
          <div className="d-flex justify-content-between">
            <strong>Total</strong>
            <strong className="primary-c fs-5">₹{order.total}</strong>
          </div>
        </div>

        {/* Back */}
        <div className="text-center mt-4 mb-4">
          <button onClick={() => router.push("/orders")} className="view-orders-btn">
            ← Back to My Orders
          </button>
        </div>
      </div>

      <Footer />

      <style jsx>{`
        .timeline-container { position: relative; padding-top: 40px; }
        .progress-bar-bg { position: absolute; top: 25px; left: 0; right: 0; height: 6px; background-color: #e9ecef; border-radius: 4px; }
        .progress-bar-fill { position: absolute; top: 25px; left: 0; height: 6px;    background: linear-gradient(90deg, #6c5dd4, #837cb8); border-radius: 4px; transition: width 0.9s ease-in-out; }
        .timeline-steps { position: relative; z-index: 2; }
        .timeline-icon { width: 50px; height: 50px; border-radius: 50%; background-color: #e9ecef; display: flex; justify-content: center; align-items: center; margin: 0 auto 10px; font-size: 22px; color: #888; transition: all 0.4s ease; }
        .timeline-icon.completed { background: #6C5DD4; color: #fff; transform: scale(1.08); box-shadow: 0 4px 10px rgba(114,9,183,0.25); }
        .timeline-title { font-size: 14px; font-weight: 600; }
        @media (max-width: 576px) { .timeline-icon { width: 40px; height: 40px; font-size: 18px; } .timeline-title { font-size: 12px; } }
      `}</style>
    </div>
  );
}




// "use client";
// import { useEffect, useState } from "react";
// import { useRouter } from "next/router";
// import axios from "axios";
// import { toast } from "react-hot-toast";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import {
//   FaTruck,
//   FaBoxOpen,
//   FaHome,
//   FaClipboardList,
//   FaTimesCircle,
//   FaCog,
//   FaThumbsUp,
//   FaPrint,
// } from "react-icons/fa";

// export default function TrackOrderPage() {
//   const router = useRouter();
//   const { id } = router.query;
//   const [order, setOrder] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // canonical stages in proper order
//   const stages = [
//     { title: "Pending", icon: <FaClipboardList /> },
//     { title: "Processing", icon: <FaCog /> },
//     { title: "In Progress", icon: <FaBoxOpen /> },
//     { title: "Design Approved", icon: <FaThumbsUp /> },
//     { title: "Printing", icon: <FaPrint /> },
//     { title: "Shipped", icon: <FaTruck /> },
//     { title: "Delivered", icon: <FaHome /> },
//   ];

//   // normalize backend status
//   const mapStatusToStage = (rawStatus) => {
//     if (!rawStatus) return null;
//     const s = rawStatus.toLowerCase();

//     if (["cancelled", "canceled"].includes(s)) return "Cancelled";
//     if (["rejected", "design rejected"].includes(s)) return "Rejected";
//     if (s.includes("deliver")) return "Delivered";
//     if (s.includes("ship") || s.includes("dispatch")) return "Shipped";
//     if (s.includes("print")) return "Printing";
//     if (s.includes("design") && s.includes("approved")) return "Design Approved";
//     if (s.includes("progress")) return "In Progress";
//     if (s.includes("process")) return "Processing";
//     if (s.includes("pending") || s.includes("received")) return "Pending";

//     return "Pending";
//   };

//   // fetch order repeatedly
//   useEffect(() => {
//     if (!id) return;
//     let active = true;

//     const fetchOrder = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get(`/api/orders/${id}`, {
//           headers: token ? { Authorization: `Bearer ${token}` } : {},
//           withCredentials: true,
//         });
//         if (!active) return;
//         if (res.data?.order) setOrder(res.data.order);
//         else toast.error("Order not found");
//       } catch (err) {
//         console.error(err);
//         toast.error("Error loading order details");
//       } finally {
//         if (active) setLoading(false);
//       }
//     };

//     fetchOrder();
//     const interval = setInterval(fetchOrder, 8000);
//     return () => {
//       active = false;
//       clearInterval(interval);
//     };
//   }, [id]);

//   if (loading)
//     return (
//       <div className="d-flex justify-content-center align-items-center vh-100">
//         <div className="spinner-border primary-c" />
//       </div>
//     );

//   if (!order)
//     return (
//       <div className="text-center py-5">
//         <h5>Order not found</h5>
//         <button
//           className="btn btn-outline-primary mt-3"
//           onClick={() => router.push("/orders")}
//         >
//           ← Back to Orders
//         </button>
//       </div>
//     );

//   const mappedStage = mapStatusToStage(order.status);
//   const currentStageIndex = stages.findIndex(
//     (s) => s.title.toLowerCase() === mappedStage.toLowerCase()
//   );

//   const isTerminal = ["cancelled", "rejected", "design rejected"].includes(
//     (order.status || "").toLowerCase()
//   );

//   const progressPercent =
//     isTerminal || mappedStage === "Delivered"
//       ? 100
//       : currentStageIndex >= 0
//       ? ((currentStageIndex + 1) / stages.length) * 100
//       : 0;

//   return (
//     <>
//       <Topbar />
//       <div className="container py-5">
//         {/* HEADER */}
//         <div className="card  p-4 mb-4">
//           <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
//             <div>
//               <h5 className="fw-bold mb-1">Track Your Order</h5>
//               <small className="text-muted">
//                 Order #{order.orderNumber} • Placed on{" "}
//                 {new Date(order.createdAt).toLocaleString()}
//               </small>
//             </div>

//             <span
//               className={`badge fs-6 px-3 py-2 ${
//                 isTerminal
//                   ? "bg-danger"
//                   : mappedStage === "Delivered"
//                   ? "bg-success"
//                   : "bg-primary"
//               }`}
//             >
//               {order.status}
//             </span>
//           </div>
//         </div>

//         {/* PROGRESS TRACKER */}
//         <div className="card  p-4 mb-5">
//           <h6 className="fw-semibold mb-4 primary-c">Tracking Progress</h6>

//           {!isTerminal ? (
//             <div className="timeline-container position-relative">
//               <div className="progress-bar-bg" />
//               <div
//                 className="progress-bar-fill"
//                 style={{
//                   width: `${progressPercent}%`,
//                 }}
//               />
//               <div className="timeline-steps d-flex justify-content-between">
//                 {stages.map((step, i) => {
//                   const isCompleted =
//                     mappedStage === "Delivered" || i <= currentStageIndex;
//                   return (
//                     <div key={i} className="text-center flex-fill px-2">
//                       <div
//                         className={`timeline-icon ${
//                           isCompleted ? "completed" : ""
//                         }`}
//                       >
//                         {step.icon}
//                       </div>
//                       <div
//                         className={`timeline-title ${
//                           isCompleted
//                             ? "text-success fw-semibold"
//                             : "text-muted"
//                         }`}
//                       >
//                         {step.title}
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           ) : (
//             <div className="text-center py-4">
//               <FaTimesCircle size={50} className="text-danger mb-3" />
//               <h5 className="text-danger fw-bold mb-2">{order.status}</h5>
//               {order.remarks && <p className="text-muted">{order.remarks}</p>}
//             </div>
//           )}
//         </div>

//         {/* CUSTOMER & SHIPPING */}
//         <div className="row g-4 mb-4">
//           <div className="col-md-6">
//             <div className="card  p-4">
//               <h6 className="fw-semibold primary-c mb-2">
//                 Customer Details
//               </h6>
//               <p className="mb-1 fw-medium">
//                 {order.shipping?.name || order.user?.name}
//               </p>
//               <p className="mb-1">
//                 {order.shipping?.phone || order.user?.phone}
//               </p>
//               {order.user?.email && (
//                 <p className="mb-0 text-muted">{order.user.email}</p>
//               )}
//             </div>
//           </div>

//           <div className="col-md-6">
//             <div className="card  p-4">
//               <h6 className="fw-semibold primary-c mb-2">
//                 Shipping Address
//               </h6>
//               <p className="mb-0">
//                 {order.shipping?.street || order.shipping?.address || "—"}
//               </p>
//               <p className="mb-0">
//                 {order.shipping?.city || ""}{" "}
//                 {order.shipping?.city ? ", " : ""}
//                 {order.shipping?.state || ""} {order.shipping?.zip || ""}
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* ORDER SUMMARY */}
//         <div className="card  p-4">
//           <h6 className="fw-semibold mb-3 primary-c">Order Summary</h6>
//           {order.items?.map((item, i) => (
//             <div key={i} className="d-flex justify-content-between mb-2">
//               <span>
//                 {item.product?.name || "Product"} × {item.quantity}
//               </span>
//               <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
//             </div>
//           ))}
//           <hr />
//           <div className="d-flex justify-content-between">
//             <strong>Total</strong>
//             <strong className="primary-c fs-5">₹{order.total}</strong>
//           </div>
//         </div>

//         {/* BACK BUTTON */}
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

//       <style jsx>{`
//         .timeline-container {
//           position: relative;
//           padding-top: 40px;
//         }
//         .progress-bar-bg {
//           position: absolute;
//           top: 25px;
//           left: 0;
//           right: 0;
//           height: 6px;
//           background-color: #e9ecef;
//           border-radius: 4px;
//         }
//         .progress-bar-fill {
//           position: absolute;
//           top: 25px;
//           left: 0;
//           height: 6px;
//           background: linear-gradient(90deg, #6a11cb, #2575fc);
//           border-radius: 4px;
//           transition: width 0.9s ease-in-out;
//         }
//         .timeline-steps {
//           position: relative;
//           z-index: 2;
//         }
//         .timeline-icon {
//           width: 52px;
//           height: 52px;
//           border-radius: 50%;
//           background-color: #f1f3f5;
//           display: flex;
//           justify-content: center;
//           align-items: center;
//           margin: 0 auto 10px;
//           font-size: 22px;
//           color: #888;
//           transition: all 0.4s ease;
//         }
//         .timeline-icon.completed {
//           background: linear-gradient(135deg, #6a11cb, #2575fc);
//           color: #fff;
//           transform: scale(1.08);
//           box-shadow: 0 4px 12px rgba(37, 117, 252, 0.25);
//         }
//         .timeline-title {
//           font-size: 14px;
//           font-weight: 600;
//         }
//         @media (max-width: 576px) {
//           .timeline-icon {
//             width: 40px;
//             height: 40px;
//             font-size: 18px;
//           }
//           .timeline-title {
//             font-size: 12px;
//           }
//         }
//       `}</style>
//     </>
//   );
// }
