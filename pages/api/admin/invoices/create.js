// pages/api/admin/invoices/create.js
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import Order from "@/models/Order";
import { generateInvoiceNumber } from "@/utils/generateInvoiceNumber";
import { logActivity } from "@/lib/logActivity";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();

    let {
      orderId,
      orderNumbers = [],
      items,
      gstPercent = 0,
      gstType = "INTRA",
      partnerType = "B2B",
      remarks = "",
      declaration = "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nGoods Once Sold Will Not be Taken back. All disputes are subject to Lucknow's Jurisdiction.",
      invoiceNumber: manualInvoiceNumber,
      invoiceDate: manualInvoiceDate,
      shipToAddress = null,
      billToAddress = null,
      coupon = null,
    } = req.body;

    if (!orderId || !items?.length) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // orderId may be a MongoDB ObjectId or an order number — try both
    let order = null;
    if (/^[a-f\d]{24}$/i.test(String(orderId))) {
      order = await Order.findById(orderId).populate("user");
    }
    if (!order) {
      const normalized = String(orderId).trim().replace(/^#/, "");
      order = await Order.findOne({ orderNumber: normalized }).populate("user");
    }
    if (!order) return res.status(404).json({ message: "Order not found" });

    // ── Duplicate invoice guard ───────────────────────────────────────────────
    const existing = await Invoice.findOne({ orderId: order._id });
    if (existing) {
      return res.status(400).json({
        message: `Invoice ${existing.invoiceNumber} already exists for this order.`,
      });
    }

    // ── Tax calculations ──────────────────────────────────────────────────────
    const subTotal       = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const couponDiscount = Number(coupon?.discountAmount || 0);
    const couponCode     = coupon?.code || "";
    // GST is on the full item amount (as charged at order time).
    // Coupon discount reduces the final grand total, not the taxable base.
    const taxableValue   = subTotal;

    let cgstPercent = 0, sgstPercent = 0, igstPercent = 0;
    let cgstAmount  = 0, sgstAmount  = 0, igstAmount  = 0;
    let gstAmount   = 0;

    if (gstType === "INTRA") {
      cgstPercent = gstPercent / 2;
      sgstPercent = gstPercent / 2;
      cgstAmount  = (taxableValue * cgstPercent) / 100;
      sgstAmount  = (taxableValue * sgstPercent) / 100;
      gstAmount   = cgstAmount + sgstAmount;
    } else if (gstType === "INTER") {
      igstPercent = gstPercent;
      igstAmount  = (taxableValue * igstPercent) / 100;
      gstAmount   = igstAmount;
    }
    // NONE → all zero

    const grandTotal = taxableValue + gstAmount - couponDiscount;

    // ── Items with taxable amount ──────────────────────────────────────────────
    const enrichedItems = items.map(item => ({
      ...item,
      taxableAmount: Number(item.amount || 0),
    }));

    // ── Determine partnerType from GST ────────────────────────────────────────
    const hasGst = !!(order.user?.gstNumber);
    const resolvedPartnerType = partnerType || (hasGst ? "B2B" : "B2C");

    const invoiceNum = manualInvoiceNumber?.trim() || generateInvoiceNumber();
    const invoiceDateVal = manualInvoiceDate ? new Date(manualInvoiceDate) : new Date();

    const invoice = await Invoice.create({
      invoiceNumber: invoiceNum,
      invoiceDate:   invoiceDateVal,
      orderId:       order._id,
      orderNumber:   order.orderNumber,
      orderNumbers:  orderNumbers.length > 0 ? orderNumbers : [order.orderNumber],
      partnerId:     order.user?._id,
      partnerName:   order.user?.name || "—",
      partnerType:   resolvedPartnerType,

      partnerAddress: billToAddress || {
        name:        order.user?.name || "—",
        companyName: order.user?.companyName || "",
        gst:         order.user?.gstNumber || "",
        phone:       order.user?.phone || order.shipping?.phone || "",
        email:       order.user?.email || "",
        street:      order.user?.businessAddress || order.shipping?.street || "",
        city:        order.user?.city || order.shipping?.city || "",
        state:       order.user?.state || order.shipping?.state || "",
        zip:         order.user?.pinCode || order.shipping?.zip || "",
      },

      sellerGst:     "09CORPG5317P1Z6",
      sellerAddress: "591/eya/19 kumhar mandi, Kharika telibagh Lucknow",
      shipToAddress: shipToAddress || null,
      items: enrichedItems,

      subTotal,
      couponCode,
      couponDiscount,
      taxableValue,
      gstPercent,
      gstType,
      cgstPercent, sgstPercent, igstPercent,
      cgstAmount,  sgstAmount,  igstAmount,
      gstAmount,
      grandTotal,

      paymentSnapshot: {
        paymentMethod:  order.paymentMethod,
        paymentStatus:  order.paymentStatus,
        transactionId:  order.razorpay?.paymentId || null,
      },

      remarks,
      declaration,
      status: "DRAFT",
    });

    res.status(201).json({ message: "Invoice draft created", invoice });
    logActivity(req, "invoice_created",
      `Invoice ${invoice.invoiceNumber} created for order #${invoice.orderNumber} (${invoice.partnerName})`,
      { entity: "invoice", entityId: String(invoice._id), meta: { invoiceNumber: invoice.invoiceNumber, orderNumber: invoice.orderNumber } }
    );
    return;

  } catch (error) {
    console.error("INVOICE CREATE ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
}



// import dbConnect from "@/lib/dbConnect";
// import Invoice from "@/models/Invoice";
// import Order from "@/models/Order";
// import User from "@/models/User";
// import { generateInvoiceNumber } from "@/utils/generateInvoiceNumber";

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   try {
//     await dbConnect();

//     let { orderId, items, gstPercent = 0, remarks = "" } = req.body;

//     console.log("REQ BODY:", req.body);

//     if (!orderId || !items || !items.length) {
//       return res.status(400).json({ message: "Missing required fields" });
//     }

//     // 🔥 IMPORTANT FIX
//     // orderId is actually orderNumber (with or without #)
//     orderId = String(orderId).trim().replace(/^#/, "");

//     // 🔹 Fetch order using orderNumber (NOT _id)
//     const order = await Order.findOne({
//       orderNumber: orderId,
//     }).populate("user");

//     if (!order) {
//       return res.status(404).json({ message: "Order not found" });
//     }

//     // 🔹 Calculate totals
//     const subTotal = items.reduce(
//       (sum, item) => sum + Number(item.amount || 0),
//       0,
//     );

//     const gstAmount = (subTotal * gstPercent) / 100;
//     const grandTotal = subTotal + gstAmount;

//     // 🔹 Create invoice (DRAFT)
//     const invoice = await Invoice.create({
//       invoiceNumber: generateInvoiceNumber(),

//       // 🔹 Order reference + snapshot
//       orderId: order._id,
//       orderNumber: order.orderNumber,

//       // 🔹 PARTNER SNAPSHOT (THIS FIXES YOUR ISSUE)
//       partnerId: order.user?._id,
//       partnerName: order.user?.name || "—",


//        // 🔥 THIS IS THE FIX
//   // walletTxnId: order.walletTxnId || null,
    

//       partnerAddress: {
//   // Identity
//   name: order.user?.name || "—",
//   companyName: order.user?.companyName || "",

//   // GST
//   gst: order.user?.gstNumber || "",

//   // Address (prefer business address, fallback to shipping)
//   street:
//     order.user?.businessAddress ||
//     order.shipping?.street ||
//     "",

//   city:
//     order.user?.city ||
//     order.shipping?.city ||
//     "",

//   state:
//     order.user?.state ||
//     order.shipping?.state ||
//     "",

//   zip:
//     order.user?.pinCode ||
//     order.shipping?.zip ||
//     "",

//   // Contact
//   phone: order.user?.phone || order.shipping?.phone || "",
//   email: order.user?.email || "",
// },



//       // 🔹 Financials
//       items,
//       subTotal,
//       gstPercent,
//       gstAmount,
//       grandTotal,

//       paymentSnapshot: {
//         paymentMethod: order.paymentMethod,
//         paymentStatus: order.paymentStatus,
//         transactionId: order.razorpay?.paymentId || null,
//       },

//       remarks,
//       status: "DRAFT",
//     });

//     return res.status(201).json({
//       message: "Invoice draft created successfully",
//       invoice,
//     });
//   } catch (error) {
//     console.error("ADMIN INVOICE CREATE ERROR:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// }
