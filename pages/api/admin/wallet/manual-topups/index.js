// Admin → the manual (bank transfer) wallet top-up requests partners raised.
import dbConnect from "@/lib/dbConnect";
import { requireAdminPermission } from "@/lib/adminAuth";
import WalletTopupRequest from "@/models/WalletTopupRequest";
import Wallet from "@/models/Wallet";
// Imported so the User model is registered before populate() runs
import User from "@/models/User";

const STATUSES = ["pending", "approved", "rejected", "refunded"];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const admin = await requireAdminPermission(req, res, "wallet");
  if (!admin) return;

  try {
    const { status, search, from, to } = req.query;

    const filter = {};
    if (STATUSES.includes(status)) filter.status = status;

    // Date range on when the request was raised. Both days are included, so
    // picking the same date twice gives that one day.
    const raisedOn = {};
    if (from) {
      const start = new Date(`${from}T00:00:00`);
      if (!Number.isNaN(start.getTime())) raisedOn.$gte = start;
    }
    if (to) {
      const end = new Date(`${to}T23:59:59.999`);
      if (!Number.isNaN(end.getTime())) raisedOn.$lte = end;
    }
    if (Object.keys(raisedOn).length) filter.createdAt = raisedOn;

    let requests = await WalletTopupRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .populate("user", "name companyName email phone memberId")
      .lean();

    // Searching by partner or by the bank reference, done here because the
    // partner fields live on another collection
    const term = String(search || "").trim().toLowerCase();
    if (term) {
      requests = requests.filter((r) => {
        const u = r.user || {};
        return [
          r.requestNumber,
          r.referenceNumber,
          u.name,
          u.companyName,
          u.email,
          u.phone,
          u.memberId,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      });
    }

    // The current balance helps the admin sanity-check before approving
    const userIds = [...new Set(requests.map((r) => r.user?._id).filter(Boolean))];
    const wallets = await Wallet.find({ user: { $in: userIds } })
      .select("user balance")
      .lean();
    const balanceByUser = new Map(
      wallets.map((w) => [String(w.user), w.balance])
    );

    const withBalance = requests.map((r) => ({
      ...r,
      walletBalance: r.user ? balanceByUser.get(String(r.user._id)) ?? 0 : 0,
    }));

    const counts = await WalletTopupRequest.aggregate([
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]);

    return res.status(200).json({
      requests: withBalance,
      counts: counts.reduce((acc, c) => ({ ...acc, [c._id]: c.n }), {}),
    });
  } catch (err) {
    console.error("Manual top-up admin list error:", err);
    return res.status(500).json({ message: "Could not load requests" });
  }
}
