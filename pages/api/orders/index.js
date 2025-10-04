// pages/api/orders/index.js
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "POST") {
    try {
      const orderData = req.body;
      // Validate minimal fields
      if (!orderData.product || !orderData.quantity) return res.status(400).json({ message: "product and quantity required" });

      const order = await Order.create(orderData);
      return res.status(201).json(order);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  if (req.method === "GET") {
    // Optional: return all orders (admin)
    try {
      const orders = await Order.find().populate("product").populate("user");
      return res.status(200).json(orders);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  res.status(405).json({ message: "Method not allowed" });
}
