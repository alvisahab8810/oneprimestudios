// "use client";
// import { useRouter } from "next/router";
// import React from "react";

// export default function OrderSuccess() {
//   const router = useRouter(); // ✅ You forgot this line
//   const { orderNumber } = router.query;

//   return (
//     <div className="text-center my-5">
//       <h2 className="text-success">🎉 Order Placed Successfully!</h2>
//       {orderNumber ? (
//         <p className="fs-5">
//           Your Order Number: <strong>{orderNumber}</strong>
//         </p>
//       ) : (
//         <p className="text-muted">Fetching your order details...</p>
//       )}
//       <a href="/" className="btn btn-primary mt-3">
//         Continue Shopping
//       </a>
//     </div>
//   );
// }

"use client";
import Footer from "@/components/footer/Footer";
import Topbar from "@/components/header/Topbar";
import { useRouter } from "next/router";
import React from "react";

import { useEffect } from "react";


export default function OrderSuccess() {
  const router = useRouter();
  const { orderNumber } = router.query;


  useEffect(() => {
  const clearCartAfterOrder = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // 🔥 Clear cart on server
      await fetch("/api/cart/clear", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 🔥 Clear coupon from localStorage
      localStorage.removeItem("appliedCoupon");
    } catch (err) {
      console.error("Failed to clear cart after order:", err);
    }
  };

  clearCartAfterOrder();
}, []);


  return (
    <div className="place-order-area">
      <div className="container">
        <Topbar />
      </div>
      <div className="mob-card-order d-flex flex-column align-items-center justify-content-center p-5 bg-light">
        <div
          className="card  p-4 text-center"
          style={{ maxWidth: "500px", borderRadius: "20px" }}
        >
          <div className="mb-3">
            {/* <span style={{ fontSize: "4rem" }}>🎉</span> */}
            <img src="/assets/images/place-order.svg"></img>
          </div>
          <h3 className="mb-3">Order Placed Successfully!</h3>

          {orderNumber ? (
            <p className="fs-8 text-dark">
              Your Order Number: <strong>#{orderNumber}</strong>
            </p>
          ) : (
            <p className="text-muted">Fetching your order details...</p>
          )}

          <p className="text-secondary mt-3">
            Thank you for shopping with us! You can track your order anytime in
            your orders section.
          </p>

          <div className="shopping-btn-row  gap-3 mt-4">
            <a href="/" className="shopping-btn">
              Continue Shopping
            </a>
            <a href="/orders" className="view-orders-btn">
              View My Orders
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
