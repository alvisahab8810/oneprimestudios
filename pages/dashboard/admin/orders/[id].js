


// "use client";
// export const dynamic = "force-dynamic";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import axios from "axios";
// import { toast } from "react-hot-toast";
// import Sidebar from "@/components/admin-panel/Sidebar";
// import Topbar from "@/components/header/Topbar";



// export default function AdminOrderDetail() {
    
//   const { id } = useParams();
//   const router = useRouter();
//   const [order, setOrder] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [newStatus, setNewStatus] = useState("");

//   useEffect(() => {
//     if (!id) return;
//     axios
//       .get(`/api/orders/${id}`, { withCredentials: true })
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
//       <Sidebar />
//       <div className="flex-grow-1 p-4">
//         <Topbar title={`Order #${order.orderNumber}`} />
//         <div className="card p-3">
//           <h5>Customer Details</h5>
//           <div>{order.user?.name}</div>
//           <div>{order.user?.email}</div>

//           <hr />
//           <h5>Shipping</h5>
//           <div>{order.shipping?.name}</div>
//           <div>{order.shipping?.phone}</div>
//           <div>
//             {order.shipping?.street}, {order.shipping?.city},{" "}
//             {order.shipping?.state} - {order.shipping?.zip}
//           </div>

//           <hr />
//           <h5>Items</h5>
//           {order.items?.map((it) => (
//             <div key={it._id} className="d-flex align-items-center mb-2">
//               <img
//                 src={it.product?.mainImage || "/no-image.png"}
//                 alt=""
//                 width={60}
//                 height={60}
//                 style={{ objectFit: "cover" }}
//               />
//               <div className="ms-2">
//                 <div>{it.product?.name}</div>
//                 <div className="small text-muted">
//                   Qty: {it.quantity} × ₹{it.price}
//                 </div>
//               </div>
//             </div>
//           ))}

//           <hr />
//           <div className="d-flex justify-content-between align-items-center">
//             <div>
//               <strong>Total:</strong> ₹{order.total}
//             </div>
//             <div>
//               <select
//                 value={newStatus}
//                 onChange={(e) => setNewStatus(e.target.value)}
//                 className="form-select d-inline w-auto me-2"
//               >
//                 <option value="Pending">Pending</option>
//                 <option value="Confirmed">Confirmed</option>
//                 <option value="Shipped">Shipped</option>
//                 <option value="Delivered">Delivered</option>
//                 <option value="Cancelled">Cancelled</option>
//               </select>
//               <button className="btn btn-primary" onClick={updateStatus}>
//                 Update Status
//               </button>
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
import axios from "axios";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import Topbar from "@/components/header/Topbar";

export default function AdminOrderDetail() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    if (!id) return;
    axios
      .get(`/api/orders/${id}`, { withCredentials: true })
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
        { status: newStatus },
        { withCredentials: true }
      );
      toast.success("Order status updated");
      setOrder((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  if (loading) return <div className="p-5 text-center">Loading...</div>;
  if (!order) return <div className="p-5 text-center">Order not found</div>;

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1 p-4">
        <Topbar title={`Order #${order.orderNumber}`} />
        <div className="card p-3">
          <h5>Customer Details</h5>
          <div>{order.user?.name}</div>
          <div>{order.user?.email}</div>

          <hr />
          <h5>Shipping</h5>
          <div>{order.shipping?.name}</div>
          <div>{order.shipping?.phone}</div>
          <div>
            {order.shipping?.street}, {order.shipping?.city},{" "}
            {order.shipping?.state} - {order.shipping?.zip}
          </div>

          <hr />
          <h5>Items</h5>
          {order.items?.map((it) => (
            <div key={it._id} className="d-flex align-items-center mb-2">
              <img
                src={it.product?.mainImage || "/no-image.png"}
                alt=""
                width={60}
                height={60}
                style={{ objectFit: "cover" }}
              />
              <div className="ms-2">
                <div>{it.product?.name}</div>
                <div className="small text-muted">
                  Qty: {it.quantity} × ₹{it.price}
                </div>
              </div>
            </div>
          ))}

          <hr />
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Total:</strong> ₹{order.total}
            </div>
            <div>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="form-select d-inline w-auto me-2"
              >
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button className="btn btn-primary" onClick={updateStatus}>
                Update Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
