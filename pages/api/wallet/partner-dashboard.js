import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import PartnerWallet from "@/models/Wallet";
import WalletTopupRequest from "@/models/WalletTransaction";

export default async function handler(req, res) {
  // 🚫 Disable cache so balance always updates
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  await dbConnect();

  const user = await getUserFromToken(req);
  if (!user || user.userType !== "partner")
    return res.status(401).json({ error: "Unauthorized" });

  const wallet = await PartnerWallet.findOne({ partnerId: user._id });
  const pending = await WalletTopupRequest.find({
    partnerId: user._id,
    status: "pending",
  }).sort({ createdAt: -1 });

  return res.json({
    balance: wallet?.balance || 0,
    transactions: wallet?.transactions || [],
    pending,
  });
}
