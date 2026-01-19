import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";

export const config = {
  api: {
    bodyParser: false, // REQUIRED for Razorpay signature verification
  },
};

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // 🔐 Read raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString("utf8");

    // 🔐 Verify Razorpay signature
    const razorpaySignature = req.headers["x-razorpay-signature"];
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (razorpaySignature !== expectedSignature) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = JSON.parse(rawBody);

    // ✅ HANDLE PAYMENT SUCCESS
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      const razorpayPaymentId = payment.id;
      const razorpayQrId = payment.qr_code_id;
      const amountPaid = payment.amount / 100; // paise → rupees
      const status = payment.status;

      if (status !== "captured" || !razorpayQrId) {
        return res.status(200).json({ ignored: true });
      }

      // 🔎 Find pending wallet transaction by QR ID
      const transaction = await WalletTransaction.findOne({
        referenceId: razorpayQrId,
        status: "pending",
      });

      if (!transaction) {
        // Already processed or not wallet-related
        return res.status(200).json({ duplicate: true });
      }

      // 💰 Amount mismatch protection
      if (transaction.amount !== amountPaid) {
        transaction.status = "failed";
        await transaction.save();

        return res.status(400).json({ message: "Amount mismatch" });
      }

      // 🏦 Credit wallet
      const wallet = await Wallet.findOne({ user: transaction.user });
      if (!wallet) {
        return res.status(404).json({ message: "Wallet not found" });
      }

      wallet.balance += amountPaid;
      await wallet.save();

       // ✅ Mark transaction success
        transaction.status = "success";
       // transaction.referenceId = razorpayPaymentId;
       // ✅ Mark transaction success
       transaction.status = "success";
       transaction.paymentId = razorpayPaymentId; // store payment id separately
         await transaction.save();

      await transaction.save();

      return res.status(200).json({
        success: true,
        message: "Wallet credited successfully",
      });
    }

    // ❌ HANDLE PAYMENT FAILURE
    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      const razorpayQrId = payment.qr_code_id;

      if (!razorpayQrId) {
        return res.status(200).json({ ignored: true });
      }

      const transaction = await WalletTransaction.findOne({
        referenceId: razorpayQrId,
        status: "pending",
      });

      if (transaction) {
        transaction.status = "failed";
        await transaction.save();
      }

      return res.status(200).json({ failed: true });
    }

    // ❎ Ignore other events
    return res.status(200).json({ ignored: true });
  } catch (error) {
    console.error("❌ Razorpay Webhook Error:", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
}
