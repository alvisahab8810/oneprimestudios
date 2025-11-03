



// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import Link from "next/link";
// import { toast } from "react-hot-toast";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import { useRouter } from "next/navigation";

// export default function OrdersListPage() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [activeTab, setActiveTab] = useState("All");
//   const router = useRouter();

//   const loadOrders = async () => {
//     try {
//       const token =
//         typeof window !== "undefined" ? localStorage.getItem("token") : null;

//       let res;
//       if (token) {
//         res = await axios.get("/api/orders", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       } else {
//         res = await axios.get("/api/orders", { withCredentials: true });
//       }

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
//   }, []);

//   const filteredOrders =
//     activeTab === "All"
//       ? orders
//       : orders.filter((o) => o.status.toLowerCase() === activeTab.toLowerCase());

//   if (loading)
//     return <div className="container py-5 text-center">Loading...</div>;

//   if (!orders.length)
//     return (
//       <div>
//            <div className="container">
//          <Topbar />
//       </div>
         
//         <div className="container py-5 text-center">
//           <h3>No orders yet</h3>
//           <Link href="/products" className="btn btn-primary mt-3">
//             Shop now
//           </Link>
//         </div>
//         <Footer />
//       </div>
//     );

//   return (
//     <>
//       <div className="container">
//          <Topbar />
//       </div>
//       <div className="orders-page container py-5">
//         <h3 className="mb-4 fw-semibold">My Orders</h3>

//         {/* Tabs */}
//         <div className="tabs mb-4 d-flex gap-2">
//           {["All", "In Progress", "Delivered", "Cancelled"].map((tab) => (
//             <button
//               key={tab}
//               className={`tab-btn ${activeTab === tab ? "active" : ""}`}
//               onClick={() => setActiveTab(tab)}
//             >
//               {tab}
//             </button>
//           ))}
//         </div>

//         {/* Orders List */}
//         {filteredOrders.length === 0 ? (
//           <div className="text-center text-muted py-5">
//             No {activeTab} orders found.
//           </div>
//         ) : (
//           filteredOrders.map((o) => (
//             <div key={o._id} className="order-card mb-3">
//               <div className="order-header d-flex justify-content-between align-items-start">
//                 <div>
//                   <h6 className="fw-semibold mb-1">
//                     {o.status === "Delivered"
//                       ? "Order Delivered"
//                       : o.status === "Cancelled"
//                       ? "Order Cancelled"
//                       : "Order In Progress"}
//                   </h6>
//                   <div className="small text-muted">
//                     {new Date(o.createdAt).toLocaleString()}
//                   </div>
//                 </div>
//                 <span
//                   className={`status-badge ${
//                     o.status === "Delivered"
//                       ? "completed"
//                       : o.status === "Cancelled"
//                       ? "cancelled"
//                       : "progress"
//                   }`}
//                 >
//                   {o.status === "Delivered"
//                     ? "Completed"
//                     : o.status === "Cancelled"
//                     ? "Cancelled"
//                     : "In Progress"}
//                 </span>
//               </div>

//               <div className="order-body mt-3">
//                 <div className="fw-semibold fs-5">₹{o.total}</div>
//                 <div className="small text-muted">Paid with {o.paymentMethod}</div>
//               </div>

//               <div className="order-footer d-flex justify-content-between align-items-center mt-3">
//                 <div></div>
//                 <Link
//                   href={`/orders/${o._id}`}
//                   className={`view-link ${
//                     o.status === "Cancelled" ? "cancelled-link" : ""
//                   }`}
//                 >
//                   View Order Details →
//                 </Link>
//               </div>
//             </div>
//           ))
//         )}
//       </div>

//       <Footer />

//       <style jsx>{`
//         .orders-page {
//           // max-width: 700px;
//         }

//         /* Tabs */
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
//         }
//         .tab-btn.active {
//           background: linear-gradient(90deg, #b5179e, #7209b7);
//           color: #fff;
//           border-color: transparent;
//         }
//         .tab-btn:hover {
//           background: #f8f9fa;
//         }

//         /* Card */
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

//         /* Status Badges */
//         .status-badge {
//           border-radius: 20px;
//           font-size: 13px;
//           padding: 3px 12px;
//           font-weight: 500;
//         }
//         .status-badge.completed {
//           background: #e7f9ee;
//           color: #128a2e;
//           border: 1px solid #b4e1c1;
//         }
//         .status-badge.cancelled {
//           background: #fdebec;
//           color: #c0392b;
//           border: 1px solid #f5c6cb;
//         }
//         .status-badge.progress {
//           background: #e9e6ff;
//           color: #4a37c0;
//           border: 1px solid #d5ceff;
//         }

//         /* Links */
//         .view-link {
//           font-weight: 500;
//           color: #4a37c0;
//           text-decoration: none;
//         }
//         .cancelled-link {
//           color: #b5179e;
//         }
//         .view-link:hover {
//           text-decoration: underline;
//         }
//           .progress{
//           height:auto!important;
//           }
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

  export default function OrdersListPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("All");

    const loadOrders = async () => {
      try {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;

        const res = await axios.get("/api/orders", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          withCredentials: !token,
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
    }, []);

    // tab counts
    const counts = {
      All: orders.length,
      Delivered: orders.filter((o) => o.status?.toLowerCase() === "delivered")
        .length,
      Cancelled: orders.filter((o) => o.status?.toLowerCase() === "cancelled")
        .length,
      Rejected: orders.filter((o) => o.status?.toLowerCase() === "rejected")
        .length,
    };

    const filteredOrders =
      activeTab === "All"
        ? orders
        : orders.filter(
            (o) => o.status?.toLowerCase() === activeTab.toLowerCase()
          );

    if (loading)
      return <div className="container py-5 text-center">Loading...</div>;

    return (
      <>
        <div className="container">
          <Topbar />
        </div>

        <div className="orders-page container py-5">
          <h3 className="mb-4 fw-semibold">My Orders</h3>

          {/* Tabs */}
          <div className="tabs mb-4 d-flex flex-wrap gap-2">
            {["All", "Delivered", "Cancelled", "Rejected"].map((tab) => (
              <button
                key={tab}
                className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}{" "}
                <span className="tab-count">
                  {counts[tab] ?? 0}
                </span>
              </button>
            ))}
          </div>

          {/* Orders */}
          {filteredOrders.length === 0 ? (
            <div className="empty-state text-center py-5">
              <img
                src="/no-orders.svg"
                alt="No orders"
                width={120}
                className="mb-3 opacity-75"
              />
              <h5 className="fw-semibold mb-2">No {activeTab} Orders</h5>
              <p className="text-muted small mb-3">
                Looks like you haven't placed any {activeTab.toLowerCase()} orders
                yet.
              </p>
              <Link href="/products" className="btn btn-primary px-4 py-2">
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="order-grid">
              {filteredOrders.map((o) => {
                const lowerStatus = o.status?.toLowerCase() || "";
                let displayLabel = "In Progress";
                let badgeClass = "progress";

                if (lowerStatus === "delivered") {
                  displayLabel = "Delivered";
                  badgeClass = "completed";
                } else if (lowerStatus === "cancelled") {
                  displayLabel = "Cancelled";
                  badgeClass = "cancelled";
                } else if (lowerStatus === "rejected") {
                  displayLabel = "Rejected";
                  badgeClass = "rejected";
                }

                return (
                  <div key={o._id} className="order-card mb-3">
                    <div className="order-header d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="fw-semibold mb-1">{displayLabel}</h6>
                        <div className="small text-muted">
                          {new Date(o.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <span className={`status-badge ${badgeClass}`}>
                        {displayLabel}
                      </span>
                    </div>

                    <div className="order-body mt-3">
                      <div className="fw-semibold fs-5">₹{o.total}</div>
                      <div className="small text-muted">
                        Paid with {o.paymentMethod}
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
            background: linear-gradient(90deg, #b5179e, #7209b7);
            color: #fff;
            border-color: transparent;
            box-shadow: 0 2px 6px rgba(114, 9, 183, 0.3);
          }
          .tab-count {
            background: #f3f0ff;
            color: #5f3dc4;
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
          .status-badge.completed {
            background: #e7f9ee;
            color: #128a2e;
            border: 1px solid #b4e1c1;
          }
          .status-badge.cancelled {
            background: #fdebec;
            color: #c0392b;
            border: 1px solid #f5c6cb;
          }
          .status-badge.progress {
            background: #e9e6ff;
            color: #4a37c0;
            border: 1px solid #d5ceff;
          }
          .status-badge.rejected {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeeba;
          }

          .view-link {
            font-weight: 500;
            color: #4a37c0;
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
