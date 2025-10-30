import dbConnect from "@/lib/dbConnect";
import Wishlist from "@/models/Wishlist";
import Cart from "@/models/Cart";
import getUserFromToken from "@/lib/getUserFromToken";

export default async function handler(req, res) {
  await dbConnect();

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const userId = user._id;
  const { productId } = req.body;

  try {
    let cart = await Cart.findOne({ userId });
    if (!cart) cart = await Cart.create({ userId, items: [] });

    const existing = cart.items.find(
      (i) => i.productId.toString() === productId
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.items.push({ productId, quantity: 1 });
    }

    await cart.save();

    await Wishlist.updateOne(
      { userId },
      { $pull: { items: { productId } } }
    );

    return res.json({ message: "Moved to cart successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error moving item to cart" });
  }
}
