// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import Link from "next/link";
// import { toast } from "react-hot-toast";
// import { useRouter } from "next/navigation";
// import Sidebar from "@/components/admin-panel/Sidebar";
// import Topbar from "@/components/header/Topbar";


// export default function AdminOrdersPage() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [statusFilter, setStatusFilter] = useState("");
//   const router = useRouter();

//   const loadOrders = async () => {
//     try {
//       const res = await axios.get(`/api/admin/orders${statusFilter ? `?status=${statusFilter}` : ""}`, {
//         withCredentials: true,
//       });
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

//   if (loading) return <div className="p-5 text-center">Loading...</div>;

//   return (
//     <div className="d-flex">
//       <Sidebar />
//       <div className="flex-grow-1 p-4">
//         <Topbar title="Manage Orders" />

//         <div className="d-flex justify-content-between align-items-center mb-3">
//           <h4>All Orders</h4>
//           <select
//             className="form-select w-auto"
//             value={statusFilter}
//             onChange={(e) => setStatusFilter(e.target.value)}
//           >
//             <option value="">All</option>
//             <option value="Pending">Pending</option>
//             <option value="Confirmed">Confirmed</option>
//             <option value="Shipped">Shipped</option>
//             <option value="Delivered">Delivered</option>
//             <option value="Cancelled">Cancelled</option>
//           </select>
//         </div>

//         <div className="table-responsive">
//           <table className="table align-middle table-striped">
//             <thead className="table-dark">
//               <tr>
//                 <th>Order No</th>
//                 <th>User</th>
//                 <th>Total</th>
//                 <th>Status</th>
//                 <th>Date</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {orders.map((o) => (
//                 <tr key={o._id}>
//                   <td>{o.orderNumber}</td>
//                   <td>{o.user?.name || "—"}</td>
//                   <td>₹{o.total}</td>
//                   <td>
//                     <span className={`badge bg-${getStatusColor(o.status)}`}>
//                       {o.status}
//                     </span>
//                   </td>
//                   <td>{new Date(o.createdAt).toLocaleString()}</td>
//                   <td>
//                     <Link
//                       href={`/dashboard/admin/orders/${o._id}`}
//                       className="btn btn-sm btn-outline-primary"
//                     >
//                       View / Update
//                     </Link>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

// function getStatusColor(status) {
//   switch (status) {
//     case "Pending":
//       return "warning";
//     case "Confirmed":
//       return "info";
//     case "Shipped":
//       return "primary";
//     case "Delivered":
//       return "success";
//     case "Cancelled":
//       return "danger";
//     default:
//       return "secondary";
//   }
// }
