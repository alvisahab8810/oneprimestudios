import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import { getRazorpay, isRazorpayConfigured, toPaise } from "@/lib/razorpay";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    if (!isRazorpayConfigured()) {
      return res.status(500).json({ message: "Online payments are not configured" });
    }

    // 🔐 Auth
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🚫 PARTNER MUST NOT USE RAZORPAY FOR ORDERS
    if (user.userType !== "customer") {
      return res.status(403).json({
        message: "Online payment is allowed for customers only",
      });
    }

    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    // Razorpay's own floor is ₹1; anything larger than this is not a real cart
    if (amount < 1 || amount > 1000000) {
      return res.status(400).json({ message: "Amount is out of the allowed range" });
    }

    // The amount is only what the customer is asked to pay. Before an order is
    // created, /api/orders/create recomputes the total server-side and refuses
    // (and refunds) any payment that does not match it.
    const order = await getRazorpay().orders.create({
      amount: toPaise(amount),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        purpose: "customer_order_payment",
        userId: user._id.toString(),
      },
    });

    return res.status(200).json(order);
  } catch (error) {
    console.error("❌ Razorpay order error:", error);
    return res.status(500).json({ message: "Failed to create payment order" });
  }
}
