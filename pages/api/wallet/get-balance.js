import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import PartnerWallet from "@/models/PartnerWallet";

export default async function handler(req, res) {
  await dbConnect();

  const user = await getUserFromToken(req);
  if (!user || user.userType !== "partner")
    return res.status(401).json({ error: "Unauthorized" });

  const wallet = await PartnerWallet.findOne({ partnerId: user._id });

  return res.json({
    balance: wallet?.balance || 0
  });
}
