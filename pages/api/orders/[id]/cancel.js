// // pages/api/orders/[id]/cancel.js
// import dbConnect from "@/lib/dbConnect";
// import getUserFromToken from "@/lib/getUserFromToken";
// import Order from "@/models/Order";
// import mongoose from "mongoose";

// export default async function handler(req, res) {
//   await dbConnect();
//   const user = await getUserFromToken(req);
//   if (!user) return res.status(401).json({ message: "Unauthorized" });

//   const { id } = req.query;
//   if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid id" });

//   if (req.method === "POST") {
//     const order = await Order.findById(id);
//     if (!order) return res.status(404).json({ message: "Order not found" });
//     if (String(order.user) !== String(user._id)) return res.status(403).json({ message: "Forbidden" });

//     // only allow cancellation for certain statuses
//     if (!["Pending", "Confirmed"].includes(order.status)) {
//       return res.status(400).json({ message: `Cannot cancel order in status: ${order.status}` });
//     }

//     order.status = "Cancelled";
//     await order.save();
//     // TODO: refund logic for payments, notifications, etc.

//     return res.json({ message: "Order cancelled", order });
//   }

//   return res.status(405).end();
// }




import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();

  // const user = await getUserFromToken(req);
  const user = await getUserFromToken(req.headers.authorization);

  if (!user) return res.status(401).json({ message: "Unauthorized" });

  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: "Invalid order id" });




  
  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  if (String(order.user) !== String(user._id))
    return res.status(403).json({ message: "Forbidden" });

  // ❌ Block late-stage cancellations
  const BLOCKED_STATUSES = [
    "Printing",
    "Order Dispatched",
    "Order Delivered",
    "Delivered",
  ];

  if (BLOCKED_STATUSES.includes(order.status)) {
    return res
      .status(400)
      .json({ message: "Order can no longer be cancelled" });
  }

  // ❌ Already refunded
  if (order.paymentStatus === "REFUNDED") {
    return res.status(400).json({ message: "Order already refunded" });
  }


  console.log("CANCEL DEBUG", {
  orderId: order._id,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  orderTotal: order.total,
  userId: user._id,
});


  // 💰 WALLET REFUND
 if (
  order.paymentMethod?.toLowerCase().includes("wallet") &&
  order.paymentStatus === "PAID"
) {
    let wallet = await Wallet.findOne({ user: user._id });

    if (!wallet) {
      wallet = await Wallet.create({
        user: user._id,
        balance: 0,
      });
    }

    // credit wallet
    wallet.balance += order.total;
    await wallet.save();

    // wallet transaction entry
    await WalletTransaction.create({
      user: user._id,
      type: "credit",
      amount: order.total,
      description: `Refund for cancelled order #${order.orderNumber || order._id}`,
      referenceType: "refund",
      referenceId: order._id.toString(),
      status: "success",
    });

    order.paymentStatus = "REFUNDED";
    order.refundedAt = new Date();
  }

  order.status = "Cancelled";
  await order.save();

  return res.json({
    message: "Order cancelled and wallet refunded successfully",
    order,
  });
}
