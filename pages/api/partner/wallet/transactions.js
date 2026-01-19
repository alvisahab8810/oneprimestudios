import dbConnect from "@/lib/dbConnect";
import WalletTransaction from "@/models/WalletTransaction";
import getUserFromToken from "@/lib/getUserFromToken";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // 🔒 Partner only
  if (user.userType !== "partner") {
    return res.status(403).json({ message: "Wallet not available" });
  }

  const { page = 1, limit = 10, from, to } = req.query;

  const query = { user: user._id, status: "success" };

  // Optional date filter
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const [transactions, total] = await Promise.all([
    WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    WalletTransaction.countDocuments(query),
  ]);

  return res.status(200).json({
    transactions,
    currentPage: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
}
