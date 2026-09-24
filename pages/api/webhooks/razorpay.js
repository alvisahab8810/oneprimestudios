
// import crypto from "crypto";
// import dbConnect from "@/lib/dbConnect";
// import Wallet from "@/models/Wallet";
// import WalletTransaction from "@/models/WalletTransaction";

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method !== "POST") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   try {
//     // 🔐 Read raw body
//     const chunks = [];
//     for await (const chunk of req) {
//       chunks.push(chunk);
//     }
//     const rawBody = Buffer.concat(chunks).toString("utf8");

//     // 🔐 Verify Razorpay signature
//     const razorpaySignature = req.headers["x-razorpay-signature"];
//     const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

//     if (!secret) {
//       console.error("❌ RAZORPAY_WEBHOOK_SECRET missing");
//       return res.status(500).json({ message: "Server misconfigured" });
//     }

//     const expectedSignature = crypto
//       .createHmac("sha256", secret)
//       .update(rawBody)
//       .digest("hex");

//     if (razorpaySignature !== expectedSignature) {
//       return res.status(400).json({ message: "Invalid webhook signature" });
//     }

//     const event = JSON.parse(rawBody);

//     let razorpayQrId;
//     let amountPaid;
//     let razorpayPaymentId;

//     // ✅ HANDLE QR PAYMENT SUCCESS (BOTH EVENTS)
//     if (event.event === "payment.captured") {
//       const payment = event.payload.payment.entity;
//       razorpayQrId = payment.qr_code_id;
//       amountPaid = payment.amount / 100;
//       razorpayPaymentId = payment.id;
//     }

//     if (event.event === "order.paid") {
//       const order = event.payload.order.entity;
//       razorpayQrId = order.qr_code_id || order.id;
//       amountPaid = order.amount_paid / 100;
//       razorpayPaymentId = order.id;
//     }

//     // If not relevant event → ignore
//     if (!razorpayQrId || !amountPaid) {
//       return res.status(200).json({ ignored: true });
//     }

//     // 🔎 Find pending wallet transaction
//     const transaction = await WalletTransaction.findOne({
//       referenceId: razorpayQrId,
//       status: "pending",
//     });

//     if (!transaction) {
//       return res.status(200).json({ duplicate: true });
//     }

//     // 💰 Amount safety check
//     if (transaction.amount !== amountPaid) {
//       transaction.status = "failed";
//       await transaction.save();
//       return res.status(400).json({ message: "Amount mismatch" });
//     }

//     // 🏦 Credit wallet
//     const wallet = await Wallet.findOne({ user: transaction.user });
//     if (!wallet) {
//       return res.status(404).json({ message: "Wallet not found" });
//     }

//     wallet.balance += amountPaid;
//     await wallet.save();

//     // ✅ Mark transaction success
//     transaction.status = "success";
//     transaction.paymentId = razorpayPaymentId;
//     await transaction.save();

//     return res.status(200).json({
//       success: true,
//       message: "Wallet credited successfully",
//     });
//   } catch (error) {
//     console.error("❌ Razorpay Webhook Error:", error);
//     return res.status(500).json({ message: "Webhook processing failed" });
//   }
// }




import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import Order from "@/models/Order";
import ReturnRequest from "@/models/ReturnRequest";

export const config = {
  api: { bodyParser: false },
};

// Razorpay settles a refund over the following days and tells us here whether it
// landed. Until this fires, a gateway refund stays "pending" on our side.
async function applyRefundEvent(refund, settled) {
  const order = await Order.findOne({ "refunds.reference": refund.id });
  if (order) {
    const row = order.refunds.find((r) => r.reference === refund.id);
    if (row && row.status !== (settled ? "processed" : "failed")) {
      row.status = settled ? "processed" : "failed";
      row.settledAt = settled ? new Date() : undefined;
      if (!settled) {
        // A failed refund still owes the customer money, so the order is not settled
        row.note = [row.note, "Refund failed at Razorpay"].filter(Boolean).join(" · ");
        if (order.paymentStatus === "REFUNDED") order.paymentStatus = "PAID";
      }
      await order.save();
    }
  }

  const request = await ReturnRequest.findOne({ "refund.reference": refund.id });
  if (request && request.refund.status !== (settled ? "processed" : "failed")) {
    request.refund.status = settled ? "processed" : "failed";
    request.refund.failureReason = settled ? "" : "Razorpay could not complete the refund";
    request.history.push({
      status: request.status,
      remarks: settled
        ? `Refund ${refund.id} completed at Razorpay`
        : `Refund ${refund.id} failed at Razorpay — needs to be sent again`,
      by: "system",
      at: new Date(),
    });
    await request.save();
  }
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 🔐 Read raw body
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks).toString("utf8");

    // 🔐 Verify signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!secret) {
      console.error("❌ RAZORPAY_WEBHOOK_SECRET is not set");
      return res.status(500).json({ message: "Server misconfigured" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const event = JSON.parse(rawBody);

    // ── REFUND EVENTS — update the return request and the order ──────────────
    if (event.event === "refund.processed" || event.event === "refund.failed") {
      const refund = event.payload?.refund?.entity;
      if (!refund?.id) return res.status(200).json({ ignored: true });
      await applyRefundEvent(refund, event.event === "refund.processed");
      return res.status(200).json({ success: true });
    }

    // ✅ ONLY HANDLE PAYMENT CAPTURED
    if (event.event !== "payment.captured") {
      return res.status(200).json({ ignored: true });
    }

    const payment = event.payload.payment.entity;

    // 🔥 MOST IMPORTANT LINE
    const walletTransactionId = payment.notes?.walletTransactionId;
    if (!walletTransactionId) {
      // Customer order payments are verified at checkout, not here
      if (payment.notes?.purpose === "customer_order_payment") {
        return res.status(200).json({ ignored: true });
      }
      console.error("❌ walletTransactionId missing in notes");
      return res.status(200).json({ ignored: true });
    }

    const amountPaid = payment.amount / 100;

    // 🔎 Find transaction
    const transaction = await WalletTransaction.findById(walletTransactionId);
    if (!transaction || transaction.status === "success") {
      return res.status(200).json({ duplicate: true });
    }

    // 💰 Amount check
    if (transaction.amount !== amountPaid) {
      transaction.status = "failed";
      await transaction.save();
      return res.status(400).json({ message: "Amount mismatch" });
    }

    // 🏦 Credit wallet
    await Wallet.findOneAndUpdate(
      { user: transaction.user },
      { $inc: { balance: amountPaid } }
    );

    // ✅ Mark transaction success
    transaction.status = "success";
    transaction.paymentId = payment.id;
    await transaction.save();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Razorpay Webhook Error:", err);
    return res.status(500).json({ message: "Webhook failed" });
  }
}
