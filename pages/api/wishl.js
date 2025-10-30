import dbConnect from "@/lib/dbConnect";
import Wishlist from "@/models/Wishlist";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  await dbConnect();

  const auth = req.headers.authorization;
  if (!auth)
    return res.status(401).json({ message: "No token provided" });

  const token = auth.split(" ")[1];
  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    userId = decoded.id;
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (req.method === "GET") {
    const wishlist = await Wishlist.findOne({ user: userId }).populate("items");
    return res.status(200).json(wishlist || { items: [] });
  }

  if (req.method === "POST") {
    const { productId } = req.body;
    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, items: [productId] });
      await wishlist.save();
      return res.status(200).json({ items: wishlist.items, action: "added" });
    }

    const exists = wishlist.items.includes(productId);
    if (exists) {
      wishlist.items = wishlist.items.filter(
        (id) => id.toString() !== productId
      );
      await wishlist.save();
      return res.status(200).json({ items: wishlist.items, action: "removed" });
    } else {
      wishlist.items.push(productId);
      await wishlist.save();
      return res.status(200).json({ items: wishlist.items, action: "added" });
    }
  }

  res.status(405).json({ message: "Method not allowed" });
}
