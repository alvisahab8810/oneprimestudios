import dbConnect from "@/lib/dbConnect";
import WalletTopupRequest from "@/models/WalletTransaction";

export default async function handler(req, res) {
  await dbConnect();

  const { requestId } = req.body;

  const request = await WalletTopupRequest.findById(requestId);
  if (!request) return res.status(404).json({ error: "Not found" });

  request.status = "rejected";
  await request.save();

  return res.json({ success: true });
}
