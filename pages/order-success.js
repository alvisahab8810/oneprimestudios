// "use client";
// import { useSearchParams } from "next/navigation";

// export default function OrderSuccess() {
//   const params = useSearchParams();
// //   const orderId = params.get("orderId");

//       const { orderNumber } = router.query;

//   return (  
//     <div className="text-center my-5">
//       <h2 className="text-success fw-bold">🎉 Order Placed Successfully!</h2>
//       {/* <p>Your order ID: <strong>{orderId}</strong></p> */}
//       <p>Your Order Number: <strong>{orderNumber}</strong></p>
//       <a href="/" className="btn btn-primary mt-3">
//         Continue Shopping
//       </a>
//     </div>
//   );
// }




"use client";
import { useRouter } from "next/router";
import React from "react";

export default function OrderSuccess() {
  const router = useRouter(); // ✅ You forgot this line
  const { orderNumber } = router.query;

  return (
    <div className="text-center my-5">
      <h2 className="text-success">🎉 Order Placed Successfully!</h2>
      {orderNumber ? (
        <p className="fs-5">
          Your Order Number: <strong>{orderNumber}</strong>
        </p>
      ) : (
        <p className="text-muted">Fetching your order details...</p>
      )}
      <a href="/" className="btn btn-primary mt-3">
        Continue Shopping
      </a>
    </div>
  );
}
