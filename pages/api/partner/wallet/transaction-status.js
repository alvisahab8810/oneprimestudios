// import dbConnect from "@/lib/dbConnect";
// import WalletTransaction from "@/models/WalletTransaction";
// import getUserFromToken from "@/lib/getUserFromToken";

// export default async function handler(req, res) {
//   await dbConnect();

//   // 🔥 DISABLE CACHING (CRITICAL)
//   res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
//   res.setHeader("Pragma", "no-cache");
//   res.setHeader("Expires", "0");
//   res.setHeader("Surrogate-Control", "no-store");

//   if (req.method !== "GET") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   const user = await getUserFromToken(req.headers.authorization);
//   if (!user) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }

//   const { transactionId } = req.query;
//   if (!transactionId) {
//     return res.status(400).json({ message: "Transaction ID required" });
//   }

//   const transaction = await WalletTransaction.findOne({
//     _id: transactionId,
//     user: user._id,
//   });

//   if (!transaction) {
//     return res.status(404).json({ message: "Transaction not found" });
//   }

//   return res.status(200).json({
//     status: transaction.status,
//   });
// }





import dbConnect from "@/lib/dbConnect";
import WalletTransaction from "@/models/WalletTransaction";
import getUserFromToken from "@/lib/getUserFromToken";

export default async function handler(req, res) {
  await dbConnect();

  // 🔥 DISABLE CACHING (CRITICAL)
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { transactionId } = req.query;
  if (!transactionId) {
    return res.status(400).json({ message: "Transaction ID required" });
  }

  const transaction = await WalletTransaction.findOne({
    _id: transactionId,
    user: user._id,
  });

  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  return res.status(200).json({
    status: transaction.status,
  });
}
