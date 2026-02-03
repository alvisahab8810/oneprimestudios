import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import Order from "@/models/Order";
import User from "@/models/User";
import { generateInvoiceNumber } from "@/utils/generateInvoiceNumber";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    let { orderId, items, gstPercent = 0, remarks = "" } = req.body;

    console.log("REQ BODY:", req.body);

    if (!orderId || !items || !items.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 🔥 IMPORTANT FIX
    // orderId is actually orderNumber (with or without #)
    orderId = String(orderId).trim().replace(/^#/, "");

    // 🔹 Fetch order using orderNumber (NOT _id)
    const order = await Order.findOne({
      orderNumber: orderId,
    }).populate("user");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 🔹 Calculate totals
    const subTotal = items.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    const gstAmount = (subTotal * gstPercent) / 100;
    const grandTotal = subTotal + gstAmount;

    // 🔹 Create invoice (DRAFT)
    const invoice = await Invoice.create({
      invoiceNumber: generateInvoiceNumber(),

      // 🔹 Order reference + snapshot
      orderId: order._id,
      orderNumber: order.orderNumber,

      // 🔹 PARTNER SNAPSHOT (THIS FIXES YOUR ISSUE)
      partnerId: order.user?._id,
      partnerName: order.user?.name || "—",


       // 🔥 THIS IS THE FIX
  // walletTxnId: order.walletTxnId || null,
    

      partnerAddress: {
  // Identity
  name: order.user?.name || "—",
  companyName: order.user?.companyName || "",

  // GST
  gst: order.user?.gstNumber || "",

  // Address (prefer business address, fallback to shipping)
  street:
    order.user?.businessAddress ||
    order.shipping?.street ||
    "",

  city:
    order.user?.city ||
    order.shipping?.city ||
    "",

  state:
    order.user?.state ||
    order.shipping?.state ||
    "",

  zip:
    order.user?.pinCode ||
    order.shipping?.zip ||
    "",

  // Contact
  phone: order.user?.phone || order.shipping?.phone || "",
  email: order.user?.email || "",
},



      // 🔹 Financials
      items,
      subTotal,
      gstPercent,
      gstAmount,
      grandTotal,

      paymentSnapshot: {
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        transactionId: order.razorpay?.paymentId || null,
      },

      remarks,
      status: "DRAFT",
    });

    return res.status(201).json({
      message: "Invoice draft created successfully",
      invoice,
    });
  } catch (error) {
    console.error("ADMIN INVOICE CREATE ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
