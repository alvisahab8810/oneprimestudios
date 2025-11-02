// pages/api/wishlist/[productId].js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Wishlist from "@/models/Wishlist";

export default async function handler(req, res) {
  await dbConnect();
  const { productId } = req.query;

  const user = await getUserFromToken(req) || await getUserFromToken(req.headers?.authorization);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  if (req.method === "DELETE") {
    try {
      const wishlist = await Wishlist.findOne({ user: user._id });
      if (!wishlist) return res.status(404).json({ message: "Wishlist not found" });

      wishlist.items = wishlist.items.filter((id) => String(id) !== String(productId));
      await wishlist.save();
      await wishlist.populate("items");
      return res.status(200).json({ items: wishlist.items });
    } catch (err) {
      console.error("Wishlist DELETE error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  res.status(405).json({ message: "Method not allowed" });
}
