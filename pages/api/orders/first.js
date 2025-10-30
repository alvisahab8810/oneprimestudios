import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { getUserFromToken } from "@/lib/getUserFromToken";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "POST") {
    try {
      const user = await getUserFromToken(req);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const { cart, address, paymentMethod } = req.body;
      const totalAmount = cart.reduce(
        (sum, i) =>
          sum +
          (i.productId.salePrice || i.productId.basePrice) * i.quantity,
        0
      );

      const newOrder = await Order.create({
        userId: user._id,
        items: cart.map((i) => ({
          productId: i.productId._id,
          quantity: i.quantity,
        })),
        address,
        totalAmount,
        paymentMethod,
        status: "Pending",
      });

      res.status(201).json(newOrder);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create order" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
