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

    // ── Gate: invoice only allowed after customer places dispatch request ──────
    const dispatchOk =
      order.dispatchRequest === "pending" ||
      order.dispatchRequest === "approved" ||
      order.status === "Order Dispatched" ||
      order.status === "Order Delivered";

    if (!dispatchOk) {
      return res.status(400).json({
        message: `Invoice cannot be created yet. Customer must place a dispatch request first. Current status: "${order.status}"`,
      });
    }

    // ── Gate: no duplicate invoice for same order ─────────────────────────────
    const Invoice = (await import("@/models/Invoice")).default;
    const existing = await Invoice.findOne({ orderId: order._id });
    if (existing) {
      return res.status(400).json({
        message: `Invoice ${existing.invoiceNumber} already exists for this order.`,
      });
    }

    // 🔥 Convert order items → invoice items
    // OLD: no hsnCode in items
    // NEW: include hsnCode from product so invoice create can auto-fill it
    const invoiceItems = order.items.map((item) => ({
      description: item.product?.name || "Item",
      qty: item.quantity,
      rate: item.price,
      amount: item.quantity * item.price,
      hsnCode: item.product?.hsnCode || "",
    }));

    const partnerState   = order.user?.state   || order.shipping?.state || "";
    const partnerPincode = order.user?.pinCode || order.shipping?.zip   || "";

    // Auto-detect GST type: pincode takes priority over state
    // UP pincodes: 200001–285999
    const pin = Number(partnerPincode);
    const validPin = String(partnerPincode).trim().length === 6 && !isNaN(pin);
    let autoGstType;
    if (validPin) {
      autoGstType = (pin >= 200001 && pin <= 285999) ? "INTRA" : "INTER";
    } else {
      const upStates = ["uttar pradesh", "up"];
      autoGstType = upStates.includes(partnerState.toLowerCase().trim()) ? "INTRA"
        : partnerState ? "INTER" : "INTRA";
    }

    return res.status(200).json({
      orderId: order._id,
      orderNumber: `#${order.orderNumber}`,
      orderDate: order.createdAt,

      partnerName:        order.user?.name        || "—",
      partnerCompanyName: order.user?.companyName || "",
      partnerGst:         order.user?.gstNumber   || "",
      partnerAddress: {
        name:        order.shipping?.name   || order.user?.name || "—",
        companyName: order.user?.companyName || "",
        gst:         order.user?.gstNumber   || "",
        phone:       order.shipping?.phone   || order.user?.phone || "—",
        email:       order.user?.email       || "",
        street:      order.user?.businessAddress || order.shipping?.street || "",
        city:        order.user?.city   || order.shipping?.city  || "",
        state:       partnerState,
        zip:         partnerPincode,
      },

      orderAmount:       order.total,
      orderSubtotal:     order.subtotal,
      orderGstAmount:    order.gstAmount || 0,
      paymentMethod:     order.paymentMethod,
      paymentStatus:     order.paymentStatus,
      productGstPercent: order.items[0]?.product?.gstPercent ?? 0,
      autoGstType,

      coupon: order.coupon?.code
        ? { code: order.coupon.code, discountAmount: order.coupon.discountAmount || 0 }
        : null,

      items: invoiceItems,
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
