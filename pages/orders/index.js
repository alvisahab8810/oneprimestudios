


// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import Link from "next/link";
// import { toast } from "react-hot-toast";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import Offcanvas from "@/components/header/Offcanvas";

// export default function OrdersListPage() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState("All");

//   // ✅ Fetch Orders
//   const loadOrders = async () => {
//     try {
//       const token =
//         typeof window !== "undefined" ? localStorage.getItem("token") : null;
//       const res = await axios.get("/api/orders", {
//         headers: token ? { Authorization: `Bearer ${token}` } : {},
//         withCredentials: true,
//       });

//       setOrders(res.data.orders || []);
//     } catch (err) {
//       console.error("❌ Order load error:", err.response?.data || err.message);
//       toast.error("Failed to load orders");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadOrders();

//     // ✅ Auto refresh when window regains focus (keeps in sync with admin updates)
//     const handleFocus = () => loadOrders();
//     window.addEventListener("focus", handleFocus);
//     return () => window.removeEventListener("focus", handleFocus);
//   }, []);

//   // ✅ Map backend status to frontend display category
//   const getDisplayStatus = (status) => {
//     const s = status?.toLowerCase() || "";
//     if (
//       [
//         "pending",
//         "processing",
//         "in progress",
//         "design approved",
//         "printing",
//         "shipped",
//       ].includes(s)
//     )
//       return "In Progress";
//     if (s === "delivered" || s === "order delivered") return "Delivered";
//     if (["rejected", "design rejected", "cancelled"].includes(s))
//       return "Rejected";
//     return "In Progress";
//   };

//   // ✅ Tabs
//   const tabs = ["All", "In Progress", "Delivered", "Rejected"];

//   // ✅ Count per tab
//   const counts = {
//     All: orders.length,
//     "In Progress": orders.filter(
//       (o) =>
//         [
//           "pending",
//           "processing",
//           "in progress",
//           "design approved",
//           "printing",
//           "shipped",
//         ].includes(o.status?.toLowerCase())
//     ).length,
//     Delivered: orders.filter(
//       (o) =>
//         o.status?.toLowerCase() === "delivered" ||
//         o.status?.toLowerCase() === "order delivered"
//     ).length,
//     Rejected: orders.filter((o) =>
//       ["rejected", "design rejected", "cancelled"].includes(
//         o.status?.toLowerCase()
//       )
//     ).length,
//   };

//   const filteredOrders =
//     activeTab === "All"
//       ? orders
//       : orders.filter((o) => getDisplayStatus(o.status) === activeTab);

//   if (loading)
//     return <div className="container py-5 text-center">Loading...</div>;

//   return (
//     <>
//       <Topbar />
//       <Offcanvas/>

//       <div className="orders-page container padding-top-40 ">
//         <h3 className="mb-4 fw-semibold">My Orders</h3>
 

//         {/* ✅ Tabs */}
//         <div className="tabs mb-4 d-flex flex-wrap gap-2">
//           {tabs.map((tab) => (
//             <button
//               key={tab}
//               className={`tab-btn ${activeTab === tab ? "active" : ""}`}
//               onClick={() => setActiveTab(tab)}
//             >
//               {tab} <span className="tab-count">{counts[tab] ?? 0}</span>
//             </button>
//           ))}
//         </div>

//         {/* ✅ Orders */}
//         {filteredOrders.length === 0 ? (
//           <div className="empty-state text-center py-5 empty-wishlist-area">

//              {/* <img
//               src="/assets/images/empty-cart.png"
//               alt="Empty Cart"
//             /> */}
//             <img
//               src="/assets/images/empty-cart.png"
//               alt="No orders"
//               width={120}
//               className="mb-3 opacity-75"
//             />
//             <h5 className="fw-semibold mb-2">No {activeTab} Orders</h5>
//             <p className="text-muted small mb-3">
//               Looks like you don't have any {activeTab.toLowerCase()} orders yet.
//             </p>
//             <Link href="/products" className="continue-shoppin-btn">
//               Browse Products
//             </Link>
//           </div>
//         ) : (
//           <div className="order-grid">
//             {filteredOrders.map((o) => {
//               const displayStatus = getDisplayStatus(o.status);
//               const badgeClass =
//                 displayStatus === "Delivered"
//                   ? "completed"
//                   : displayStatus === "Rejected"
//                   ? "rejected"
//                   : "progress";

//               return (
//                 <div key={o._id} className="order-card mb-3">
//                   <div className="order-header d-flex justify-content-between align-items-start">
//                     <div>
//                       <h6 className="fw-semibold mb-1">{displayStatus}</h6>
//                       <div className="small text-muted">
//                         {new Date(o.createdAt).toLocaleString()}
//                       </div>
//                     </div>
//                     <span className={`status-badge ${badgeClass}`}>
//                       {displayStatus}
//                     </span>
//                   </div>

//                   <div className="order-body mt-3">
//                     <div className="fw-semibold fs-5">₹{o.total}</div>
//                     <div className="small text-muted">
//                       Payment: {o.paymentMethod}
//                     </div>
//                   </div>

//                   <div className="order-footer d-flex justify-content-end mt-3">
//                     <Link href={`/orders/${o._id}`} className="view-link">
//                       View Order Details →
//                     </Link>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//       <Footer />

//       {/* ✅ Modern styles */}
//       <style jsx>{`
//         .tabs {
//           border-bottom: 1px solid #eee;
//           padding-bottom: 8px;
//         }
//         .tab-btn {
//           border: 1px solid #ddd;
//           background: #fff;
//           padding: 6px 18px;
//           border-radius: 8px;
//           font-size: 15px;
//           transition: 0.2s ease;
//           position: relative;
//           font-weight: 500;
//           display: flex;
//           align-items: center;
//           gap: 6px;
//         }
//         .tab-btn.active {
//           background: #333;
//           color: #fff;
//           border-color: transparent;
//           box-shadow: 0 2px 6px rgba(114, 9, 183, 0.3);
//         }
//         .tab-count {
//           background: #f3f0ff;
//           color: #333;
//           padding: 2px 8px;
//           border-radius: 12px;
//           font-size: 13px;
//           font-weight: 600;
//         }
//         .tab-btn.active .tab-count {
//           background: rgba(255, 255, 255, 0.25);
//           color: #fff;
//         }

//         .order-card {
//           background: #fff;
//           border-radius: 12px;
//           box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
//           padding: 18px;
//           transition: 0.2s ease;
//         }
//         .order-card:hover {
//           transform: translateY(-2px);
//           box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
//         }

//         .status-badge {
//           border-radius: 20px;
//           font-size: 13px;
//           padding: 3px 12px;
//           font-weight: 500;
//           text-transform: capitalize;
//         }
//         .status-badge.progress {
//           background: #e9e6ff;
//           color: #333;
//           border: 1px solid #d5ceff;
//         }
//         .status-badge.completed {
//           background: #e7f9ee;
//           color: #128a2e;
//           border: 1px solid #b4e1c1;
//         }
//         .status-badge.rejected {
//           background: #fff3cd;
//           color: #856404;
//           border: 1px solid #ffeeba;
//         }

//         .view-link {
//           font-weight: 500;
//           color: #333;
//           text-decoration: none;
//         }
//         .view-link:hover {
//           text-decoration: underline;
//         }

//         .empty-state img {
//           max-width: 140px;
//           opacity: 0.8;
//         }

//         @media (max-width: 576px) {
//           .tab-btn {
//             flex: 1 1 auto;
//             justify-content: center;
//           }
//           .order-card {
//             padding: 14px;
//           }
//         }
//       `}</style>
//     </>
//   );
// }







"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import Offcanvas from "@/components/header/Offcanvas";

export default function OrdersListPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  // ✅ Fetch Orders
  const loadOrders = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await axios.get("/api/orders", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        withCredentials: true,
      });

      setOrders(res.data.orders || []);
    } catch (err) {
      console.error("❌ Order load error:", err.response?.data || err.message);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    // ✅ Auto refresh when window regains focus (keeps in sync with admin updates)
    const handleFocus = () => loadOrders();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // ✅ Map backend status to frontend display category


  const getDisplayStatus = (status) => {
  const s = status?.toLowerCase() || "";

  if (s === "cancelled") return "Cancelled";

  if (s === "rejected" || s === "design rejected")
    return "Rejected";

  if (s === "delivered" || s === "order delivered")
    return "Delivered";

  return "In Progress";
};


  // ✅ Tabs
  // const tabs = ["All", "In Progress", "Delivered", "Rejected"];

  const tabs = ["All", "In Progress", "Delivered", "Cancelled", "Rejected"];


  // ✅ Count per tab
  // const counts = {
  //   All: orders.length,
  //   "In Progress": orders.filter(
  //     (o) =>
  //       [
  //         "pending",
  //         "processing",
  //         "in progress",
  //         "design approved",
  //         "printing",
  //         "shipped",
  //       ].includes(o.status?.toLowerCase())
  //   ).length,
  //   Delivered: orders.filter(
  //     (o) =>
  //       o.status?.toLowerCase() === "delivered" ||
  //       o.status?.toLowerCase() === "order delivered"
  //   ).length,
  //   Rejected: orders.filter((o) =>
  //     ["rejected", "design rejected", "cancelled"].includes(
  //       o.status?.toLowerCase()
  //     )
  //   ).length,
  // };


const counts = {
  All: orders.length,

  "In Progress": orders.filter(
    (o) => getDisplayStatus(o.status) === "In Progress"
  ).length,

  Delivered: orders.filter(
    (o) => getDisplayStatus(o.status) === "Delivered"
  ).length,

  Cancelled: orders.filter(
    (o) => getDisplayStatus(o.status) === "Cancelled"
  ).length,

  Rejected: orders.filter(
    (o) => getDisplayStatus(o.status) === "Rejected"
  ).length,
};



  const filteredOrders =
    activeTab === "All"
      ? orders
      : orders.filter((o) => getDisplayStatus(o.status) === activeTab);

  if (loading)
    return <div className="container py-5 text-center">Loading...</div>;

  return (
    <>
      <Topbar />
      <Offcanvas/>

      <div className="orders-page container padding-top-40 ">
        <h3 className="mb-4 fw-semibold">My Orders</h3>
 

        {/* ✅ Tabs */}
        <div className="tabs mb-4 d-flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab} <span className="tab-count">{counts[tab] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* ✅ Orders */}
        {filteredOrders.length === 0 ? (
          <div className="empty-state text-center py-5 empty-wishlist-area">

             {/* <img
              src="/assets/images/empty-cart.png"
              alt="Empty Cart"
            /> */}
            <img
              src="/assets/images/empty-cart.png"
              alt="No orders"
              width={120}
              className="mb-3 opacity-75"
            />
            <h5 className="fw-semibold mb-2">No {activeTab} Orders</h5>
            <p className="text-muted small mb-3">
              Looks like you don't have any {activeTab.toLowerCase()} orders yet.
            </p>
            <Link href="/products" className="continue-shoppin-btn">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="order-grid">
            {filteredOrders.map((o) => {
              const displayStatus = getDisplayStatus(o.status);
             const badgeClass =
  displayStatus === "Delivered"
    ? "completed"
    : displayStatus === "Rejected"
    ? "rejected"
    : displayStatus === "Cancelled"
    ? "cancelled"
    : "progress";


              return (
                <div key={o._id} className="order-card mb-3">
                  <div className="order-header d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="fw-semibold mb-1">{displayStatus}</h6>
                      <div className="small text-muted">
                        {new Date(o.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <span className={`status-badge ${badgeClass}`}>
                      {displayStatus}
                    </span>
                  </div>

                  <div className="order-body mt-3">
                    <div className="fw-semibold fs-5">₹{o.total}</div>
                    <div className="small text-muted">
                      Payment: {o.paymentMethod}
                    </div>
                  </div>

                  <div className="order-footer d-flex justify-content-end mt-3">
                    <Link href={`/orders/${o._id}`} className="view-link">
                      View Order Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />

      {/* ✅ Modern styles */}
      <style jsx>{`
        .tabs {
          border-bottom: 1px solid #eee;
          padding-bottom: 8px;
        }
        .tab-btn {
          border: 1px solid #ddd;
          background: #fff;
          padding: 6px 18px;
          border-radius: 8px;
          font-size: 15px;
          transition: 0.2s ease;
          position: relative;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .tab-btn.active {
          background: #333;
          color: #fff;
          border-color: transparent;
          box-shadow: 0 2px 6px rgba(114, 9, 183, 0.3);
        }
        .tab-count {
          background: #f3f0ff;
          color: #333;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
        }
        .tab-btn.active .tab-count {
          background: rgba(255, 255, 255, 0.25);
          color: #fff;
        }

        .order-card {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          padding: 18px;
          transition: 0.2s ease;
        }
        .order-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .status-badge {
          border-radius: 20px;
          font-size: 13px;
          padding: 3px 12px;
          font-weight: 500;
          text-transform: capitalize;
        }
        .status-badge.progress {
          background: #e9e6ff;
          color: #333;
          border: 1px solid #d5ceff;
        }
        .status-badge.completed {
          background: #e7f9ee;
          color: #128a2e;
          border: 1px solid #b4e1c1;
        }
        .status-badge.rejected {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeeba;
        }

        .view-link {
          font-weight: 500;
          color: #333;
          text-decoration: none;
        }
        .view-link:hover {
          text-decoration: underline;
        }

        .empty-state img {
          max-width: 140px;
          opacity: 0.8;
        }

        @media (max-width: 576px) {
          .tab-btn {
            flex: 1 1 auto;
            justify-content: center;
          }
          .order-card {
            padding: 14px;
          }
        }
      `}</style>
    </>
  );
}
