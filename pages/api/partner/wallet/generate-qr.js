// import dbConnect from "@/lib/dbConnect";
// import Wallet from "@/models/Wallet";
// import WalletTransaction from "@/models/WalletTransaction";
// import getUserFromToken from "@/lib/getUserFromToken";
// import Razorpay from "razorpay";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method !== "POST") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   const user = await getUserFromToken(req.headers.authorization);
//   if (!user) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }

//   // 🔒 Partner only
//   if (user.userType !== "partner") {
//     return res.status(403).json({ message: "Wallet not available" });
//   }

//   const { amount } = req.body;

//   // 🔐 Validation
//   if (!amount || amount < 1) {
//     return res.status(400).json({
//       message: "Minimum top-up amount is ₹1",
//     });
//   }

//   // Ensure wallet exists
//   let wallet = await Wallet.findOne({ user: user._id });
//   if (!wallet) {
//     wallet = await Wallet.create({ user: user._id, balance: 0 });
//   }

//   // 1️⃣ Create pending wallet transaction
//   const transaction = await WalletTransaction.create({
//     user: user._id,
//     type: "credit",
//     amount,
//     description: "Wallet Top-Up",
//     referenceType: "wallet_topup",
//     status: "pending",
//   });

//   const qr = await razorpay.qrCode.create({
//   type: "upi_qr",

//   // ✅ COMPANY NAME (FIX #2)
//   name: "One Prime Studios",

//   usage: "single_use",
//   fixed_amount: true,
//   payment_amount: amount * 100,

//   // ✅ Cleaner description
//   description: "Wallet Top-Up",

//   close_by: Math.floor(Date.now() / 1000) + 600,

//   notes: {
//     walletTransactionId: transaction._id.toString(),
//     userId: user._id.toString(),
//     company: "One Prime Studios",
//   },
// });


//   // 3️⃣ Save Razorpay reference
//   transaction.referenceId = qr.id;
//   await transaction.save();

//   return res.status(200).json({
//     success: true,
//     transactionId: transaction._id,
//     qrId: qr.id,
//     qrImage: qr.image_url,
//     amount,
//     expiresAt: qr.close_by * 1000,
//   });
// }


// this will be removed if issue on production open above file is corrected



import dbConnect from "@/lib/dbConnect";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import getUserFromToken from "@/lib/getUserFromToken";
import Razorpay from "razorpay";
import mongoose from "mongoose";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const user = await getUserFromToken(req.headersauthorization || req.headers.authorization);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // 🔒 Partner only
  if (user.userType !== "partner") {
    return res.status(403).json({ message: "Wallet not available" });
  }

  const { amount, transactionId } = req.body;

  let txn;

  /* =================================================
     CASE 1️⃣ : CALLED FROM ADD MONEY PAGE (amount)
     ================================================= */
  if (amount && Number(amount) >= 1 && !transactionId) {
    // Ensure wallet exists
    let wallet = await Wallet.findOne({ user: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ user: user._id, balance: 0 });
    }

    // Create pending transaction
    txn = await WalletTransaction.create({
      user: user._id,
      type: "credit",
      amount: Number(amount),
      description: "Wallet Top-Up",
      referenceType: "wallet_topup",
      status: "pending",
    });
  }

  /* =================================================
     CASE 2️⃣ : CALLED FROM PAY PAGE (transactionId)
     ================================================= */
  if (transactionId) {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
      return res.status(400).json({ message: "Invalid transactionId" });
    }

    txn = await WalletTransaction.findOne({
      _id: transactionId,
      user: user._id,
      status: "pending",
    });

    if (!txn) {
      return res.status(404).json({ message: "Pending transaction not found" });
    }
  }

  if (!txn) {
    return res.status(400).json({
      message: "Either amount or transactionId is required",
    });
  }

  /* =================================================
     🔁 REUSE QR IF ALREADY GENERATED
     ================================================= */
  if (txn.referenceId && txn.qrImage && txn.expiresAt) {
    return res.status(200).json({
      transactionId: txn._id,
      qrImage: txn.qrImage,
      amount: txn.amount,
      expiresAt: txn.expiresAt,
    });
  }

  /* =================================================
     ⏩ CREATE RAZORPAY QR
     ================================================= */
  const qr = await razorpay.qrCode.create({
    type: "upi_qr",
    name: "One Prime Studios",
    usage: "single_use",
    fixed_amount: true,
    payment_amount: txn.amount * 100,
    description: "Wallet Top-Up",
    close_by: Math.floor(Date.now() / 1000) + 600,
    notes: {
      walletTransactionId: txn._id.toString(),
      userId: user._id.toString(),
    },
  });

  // Save QR details
  txn.referenceId = qr.id;
  txn.qrImage = qr.image_url;
  txn.expiresAt = qr.close_by * 1000;
  await txn.save();

  return res.status(200).json({
    transactionId: txn._id,
    qrImage: qr.image_url,
    amount: txn.amount,
    expiresAt: txn.expiresAt,
  });
}
