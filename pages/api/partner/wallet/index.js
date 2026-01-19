import dbConnect from "@/lib/dbConnect";
import Wallet from "@/models/Wallet";
import getUserFromToken from "@/lib/getUserFromToken";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // 🔒 Partner only
  if (user.userType !== "partner") {
    return res.status(403).json({ message: "Wallet not available" });
  }

  // ✅ Find or create wallet
  let wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) {
    wallet = await Wallet.create({
      user: user._id,
      balance: 0,
    });
  }

  return res.status(200).json({
    balance: wallet.balance,
    updatedAt: wallet.updatedAt,
  });
}
