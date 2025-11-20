import dbConnect from "@/lib/dbConnect";
import { verifyAdmin } from "@/lib/verifyJWT";
import WalletTopupRequest from "@/models/WalletTopupRequest";
import PartnerWallet from "@/models/PartnerWallet";

export default async function handler(req, res) {
  await dbConnect();

  const admin = await verifyAdmin(req, res);
  if (!admin) return res.status(401).json({ error: "Unauthorized" });

  const { requestId } = req.body;

  const request = await WalletTopupRequest.findById(requestId);
  if (!request) return res.status(404).json({ error: "Request not found" });

  if (request.status !== "pending")
    return res.status(400).json({ error: "Already processed" });

  // Approve request
  request.status = "approved";
  await request.save();

  let wallet = await PartnerWallet.findOne({ partnerId: request.partnerId });
  if (!wallet)
    wallet = await PartnerWallet.create({ partnerId: request.partnerId });

  // 💥 FIX: Ensure transactions is an array
  if (!Array.isArray(wallet.transactions)) {
    wallet.transactions = [];
  }

  // Add money + log transaction
  wallet.balance += request.amount;
wallet.transactions.push({
  amount: request.amount,
  type: "credit",
  description: "Wallet top-up approved by admin",
  createdAt: new Date(),
});


  await wallet.save();

  return res.json({ success: true });
}
