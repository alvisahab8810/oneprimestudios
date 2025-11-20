import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import WalletTopupRequest from "@/models/WalletTopupRequest";

export default async function handler(req, res) {
  await dbConnect();
  
  const user = await getUserFromToken(req);

  // FIXED HERE
  if (!user || user.userType !== "partner") 
    return res.status(401).json({ error: "Unauthorized" });

  const { amount } = req.body;

  if (!amount || amount <= 0)
    return res.status(400).json({ error: "Invalid amount" });

  const request = await WalletTopupRequest.create({
    partnerId: user._id,
    amount,
    status: "pending"
  });

  return res.json({ success: true, request });
}
