import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Cart from "@/models/Cart"; // or whatever model you use

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).end();
  }

  await dbConnect();

  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🔥 Clear entire cart
    await Cart.deleteMany({ user: user._id });

    return res.json({ success: true });
  } catch (err) {
    console.error("Clear cart error:", err);
    res.status(500).json({ message: "Failed to clear cart" });
  }
}
