// pages/orders/index.js
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-hot-toast";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import { useRouter } from "next/navigation";

export default function OrdersListPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      let res;
      if (token) {
        // If logged in using token auth
        res = await axios.get("/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // If logged in via cookie auth
        res = await axios.get("/api/orders", { withCredentials: true });
      }

      setOrders(res.data.orders || []);
    } catch (err) {
      console.error("❌ Order load error:", err.response?.data || err.message);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancelOrder = async (orderId) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      let res;

      if (token) {
        // Token-based auth (if stored in localStorage)
        res = await axios.post(
          `/api/orders/${orderId}/cancel`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        // Cookie-based auth (most likely your case)
        res = await axios.post(
          `/api/orders/${orderId}/cancel`,
          {},
          {
            withCredentials: true, // ✅ Send cookies
          }
        );
      }

      toast.success("Order cancelled");
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: "Cancelled" } : o))
      );
    } catch (err) {
      console.error("Cancel error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to cancel");
    }
  };

  if (loading)
    return <div className="container py-5 text-center">Loading...</div>;

  if (!orders.length)
    return (
      <div>
        <Topbar />
        <div className="container py-5 text-center">
          <h3>No orders yet</h3>
          <Link href="/products" className="btn btn-primary mt-3">
            Shop now
          </Link>
        </div>
        <Footer />
      </div>
    );

  return (
    <div>
      <Topbar />
      <div className="container py-4">
        <h3 className="mb-4">My Orders</h3>
        {orders.map((o) => (
          <div key={o._id} className="card mb-3 p-3">
            <div className="d-flex justify-content-between">
              <div>
                <strong>{o.orderNumber}</strong>
                <div className="text-muted small">
                  {new Date(o.createdAt).toLocaleString()}
                </div>
                <div>
                  Status: <span className="badge bg-info">{o.status}</span>
                </div>
              </div>
              <div>
                <Link
                  href={`/orders/${o._id}`}
                  className="btn btn-outline-primary me-2"
                >
                  View
                </Link>
                {["Pending", "Confirmed"].includes(o.status) && (
                  <button
                    className="btn btn-danger"
                    onClick={() => cancelOrder(o._id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 text-muted small">
              Items: {o.items?.length} • Total: ₹{o.total}
            </div>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  );
}
