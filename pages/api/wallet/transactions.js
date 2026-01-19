import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import PartnerWallet from "@/models/Wallet";

export default async function handler(req, res) {
  await dbConnect();

  const user = await getUserFromToken(req);
  if (!user || user.userType !== "partner")
    return res.status(401).json({ error: "Unauthorized" });

  const wallet = await PartnerWallet.findOne({ partnerId: user._id });

  res.json({
    transactions: wallet?.transactions.reverse() || []
  });
}
