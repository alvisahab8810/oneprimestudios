// Admin → every partner with their current wallet balance, for the adjustment
// panel and for a quick read of who is holding what.
import dbConnect from "@/lib/dbConnect";
import { requireAdminPermission } from "@/lib/adminAuth";
import User from "@/models/User";
import Wallet from "@/models/Wallet";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const admin = await requireAdminPermission(req, res, "wallet");
  if (!admin) return;

  try {
    const partners = await User.find({ userType: "partner" })
      .select("name companyName email phone memberId isApproved")
      .sort({ companyName: 1, name: 1 })
      .lean();

    const wallets = await Wallet.find({
      user: { $in: partners.map((p) => p._id) },
    })
      .select("user balance updatedAt")
      .lean();

    const byUser = new Map(wallets.map((w) => [String(w.user), w]));

    const rows = partners.map((p) => ({
      _id: p._id,
      name: p.name || "",
      companyName: p.companyName || "",
      email: p.email || "",
      phone: p.phone || "",
      memberId: p.memberId || "",
      isApproved: p.isApproved !== false,
      balance: byUser.get(String(p._id))?.balance ?? 0,
      updatedAt: byUser.get(String(p._id))?.updatedAt || null,
    }));

    return res.status(200).json({ partners: rows });
  } catch (err) {
    console.error("Wallet balances error:", err);
    return res.status(500).json({ message: "Could not load partner balances" });
  }
}
