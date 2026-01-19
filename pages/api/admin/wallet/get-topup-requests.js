import dbConnect from "@/lib/dbConnect";
import { verifyAdmin } from "@/lib/verifyJWT";
import WalletTopupRequest from "@/models/WalletTransaction";
import User from "@/models/User";

export default async function handler(req, res) {
  await dbConnect();

const admin = await verifyAdmin(req, res);
 if (!admin) return res.status(401).json({ error: "Unauthorized" });
  const requests = await WalletTopupRequest.find()
    .sort({ createdAt: -1 })
    .populate("partnerId", "name email phone");

  return res.json({ success: true, requests });
}
