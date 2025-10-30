// pages/orders/[id].js
"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import { toast } from "react-hot-toast";

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [order, setOrder] = useState(null);

//   useEffect(() => {
//     if (!id) return;
//     axios.get(`/api/orders/${id}`).then((res)=>{
//       setOrder(res.data.order);
//     }).catch(err=>{
//       toast.error("Failed to load order");
//       router.push("/orders");
//     });
//   }, [id]);


useEffect(() => {
  if (!id) return;

  const loadOrder = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      let res;
      if (token) {
        res = await axios.get(`/api/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await axios.get(`/api/orders/${id}`, { withCredentials: true });
      }

      setOrder(res.data.order);
    } catch (err) {
      console.error("❌ Failed to load order:", err.response?.data || err.message);
      toast.error("Failed to load order");
      router.push("/orders");
    }
  };

  loadOrder();
}, [id]);

  if (!order) return <div className="container py-5">Loading...</div>;

  return (
    <>
      <Topbar />
      <div className="container py-4">
        <h3>Order {order.orderNumber}</h3>
        <div className="card p-3 mb-3">
          <h5>Shipping</h5>
          <div>{order.shipping?.name}</div>
          <div>{order.shipping?.phone}</div>
          <div>{order.shipping?.street}, {order.shipping?.city}, {order.shipping?.state} - {order.shipping?.zip}</div>
        </div>

        <div className="card p-3 mb-3">
          <h5>Items</h5>
          {order.items.map((it) => (
            <div key={it._id} className="d-flex align-items-center py-2 border-bottom">
              <img src={it.product?.mainImage || "/no-image.png"} width={80} height={80} style={{objectFit:'cover'}} />
              <div className="ms-3">
                <div>{it.product?.name || it.product}</div>
                <div className="small text-muted">Qty: {it.quantity} × ₹{it.price} = ₹{it.quantity * it.price}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-3">
          <h5>Order Summary</h5>
          <div>Total: ₹{order.total}</div>
          <div>Status: {order.status}</div>
        </div>
      </div>
      <Footer />
    </>
  );
}
