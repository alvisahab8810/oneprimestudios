// pages/api/cart/[id].js
import dbConnect from "@/lib/dbConnect";
import Cart from "@/models/Cart";
import { getUserFromCookie } from "@/lib/getUserFromCookie";

export default async function handler(req, res) {
  const user = await getUserFromCookie(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  await dbConnect();

  const { id } = req.query;

  if (req.method === "DELETE") {
    const cart = await Cart.findOne({ user: user._id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter((item) => item._id.toString() !== id);
    await cart.save();
    return res.status(200).json(cart.items);
  }

  res.status(405).json({ message: "Method not allowed" });
}
