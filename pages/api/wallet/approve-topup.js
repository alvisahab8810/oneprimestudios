import dbConnect from "@/lib/dbConnect";
import WalletTopupRequest from "@/models/WalletTopupRequest";
import PartnerWallet from "@/models/PartnerWallet";

export default async function handler(req, res) {
  await dbConnect();

  const { requestId } = req.body;

  const request = await WalletTopupRequest.findById(requestId);
  if (!request) return res.status(404).json({ error: "Request not found" });

  if (request.status !== "pending")
    return res.status(400).json({ error: "Already processed" });

  // Update request
  request.status = "approved";
  await request.save();

  // Credit wallet
  let wallet = await PartnerWallet.findOne({ partnerId: request.partnerId });
  if (!wallet) {
    wallet = await PartnerWallet.create({
      partnerId: request.partnerId,
      balance: 0,
      transactions: []
    });
  }

  wallet.balance += request.amount;
  wallet.transactions.push({
    amount: request.amount,
    type: "credit",
    description: "Wallet topup approved by admin"
  });

  await wallet.save();

  return res.json({ success: true });
}
