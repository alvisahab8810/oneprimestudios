import Razorpay from "razorpay";
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
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

    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // 🔐 CREATE RAZORPAY ORDER (SERVER SIDE)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
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
