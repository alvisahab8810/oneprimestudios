import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import User from "@/models/User";
import Product from "@/models/Product";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    let { orderId } = req.query;
    if (!orderId) {
      return res.status(400).json({ message: "orderId is required" });
    }

    orderId = decodeURIComponent(orderId).trim();
    const normalizedOrderNumber = orderId.replace(/^#/, "");

    const order = await Order.findOne({
      orderNumber: normalizedOrderNumber
    })
      .populate("user")
      .populate("items.product");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 🔥 Convert order items → invoice items
    const invoiceItems = order.items.map((item) => ({
      description: item.product?.name || "Item",
      qty: item.quantity,
      rate: item.price,
      amount: item.quantity * item.price
    }));

    return res.status(200).json({
      orderId: order._id,
      orderNumber: `#${order.orderNumber}`,
      orderDate: order.createdAt,

      // ✅ Partner snapshot (WITH EMAIL)
      partnerName: order.user?.name || "—",
      partnerAddress: {
        name: order.shipping?.name || order.user?.name || "—",
        phone: order.shipping?.phone || "—",
        email: order.user?.email || "", // 🔥 ADD THIS
        street: order.shipping?.street || "",
        city: order.shipping?.city || "",
        state: order.shipping?.state || "",
        zip: order.shipping?.zip || "",
      },

      orderAmount: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,

      items: invoiceItems
    });

  } catch (error) {
    console.error("ORDER PREVIEW ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
}








// import dbConnect from "@/lib/dbConnect";
// import Order from "@/models/Order";
// import User from "@/models/User";
// import Product from "@/models/Product";

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   try {
//     await dbConnect();

//     let { orderId } = req.query;
//     if (!orderId) {
//       return res.status(400).json({ message: "orderId is required" });
//     }

//     orderId = decodeURIComponent(orderId).trim();
//     const normalizedOrderNumber = orderId.replace(/^#/, "");

//     const order = await Order.findOne({
//       orderNumber: normalizedOrderNumber
//     })
//       .populate("user")
//       .populate("items.product"); // 🔥 IMPORTANT

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     // 🔥 Convert order items → invoice items
//     const invoiceItems = order.items.map((item) => ({
//       description: item.product?.name || "Item",
//       qty: item.quantity,
//       rate: item.price,
//       amount: item.quantity * item.price
//     }));

//     return res.status(200).json({
//       orderId: order._id,
//       orderNumber: `#${order.orderNumber}`,
//       orderDate: order.createdAt,

//       // Partner (stored as user)
//       partnerName: order.user?.name || "—",
//       partnerAddress: {
//         name: order.shipping?.name || order.user?.name || "—",
//         phone: order.shipping?.phone || "—",
//         street: order.shipping?.street || "",
//         city: order.shipping?.city || "",
//         state: order.shipping?.state || "",
//         zip: order.shipping?.zip || "",
//       },

//       orderAmount: order.total,
//       paymentMethod: order.paymentMethod,
//       paymentStatus: order.paymentStatus,

//       // 🔥 THIS IS THE KEY ADDITION
//       items: invoiceItems
//     });

//   } catch (error) {
//     console.error("ORDER PREVIEW ERROR:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// }
