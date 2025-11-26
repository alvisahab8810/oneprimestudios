import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import getUserFromToken from "@/lib/getUserFromToken";

export default async function handler(req, res) {
  await dbConnect();

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthenticated" });

  const { id } = req.query;

  if (req.method === "POST") {
    const order = await Order.findOne({ _id: id, user: user._id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "Order Ready")
      return res.status(400).json({ message: "Order is not ready yet" });

    order.dispatchRequest = "pending";
    await order.save();

    return res.status(200).json({ message: "Dispatch request sent" });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
