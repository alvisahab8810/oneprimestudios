import dbConnect from "@/lib/dbConnect";
import Wallet from "@/models/Wallet";
import WalletTransaction from "@/models/WalletTransaction";
import getUserFromToken from "@/lib/getUserFromToken";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
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

  const { amount } = req.body;

  // 🔐 Validation
  if (!amount || amount < 1) {
    return res.status(400).json({
      message: "Minimum top-up amount is ₹1",
    });
  }

  // Ensure wallet exists
  let wallet = await Wallet.findOne({ user: user._id });
  if (!wallet) {
    wallet = await Wallet.create({ user: user._id, balance: 0 });
  }

  // 1️⃣ Create pending wallet transaction
  const transaction = await WalletTransaction.create({
    user: user._id,
    type: "credit",
    amount,
    description: "Wallet Top-Up",
    referenceType: "wallet_topup",
    status: "pending",
  });

  // 2️⃣ Create Razorpay QR
  // const qr = await razorpay.qrCode.create({
  //   type: "upi_qr",
  //   name: `Wallet Top-Up - ${user.name}`,
  //   usage: "single_use",
  //   fixed_amount: true,
  //   payment_amount: amount * 100, // paise
  //   description: `Wallet Top-Up | Txn ${transaction._id}`,
  //   close_by: Math.floor(Date.now() / 1000) + 600, // 10 minutes
  //   notes: {
  //     walletTransactionId: transaction._id.toString(),
  //     userId: user._id.toString(),
  //   },
  // });


  const qr = await razorpay.qrCode.create({
  type: "upi_qr",

  // ✅ COMPANY NAME (FIX #2)
  name: "One Prime Studios",

  usage: "single_use",
  fixed_amount: true,
  payment_amount: amount * 100,

  // ✅ Cleaner description
  description: "Wallet Top-Up",

  close_by: Math.floor(Date.now() / 1000) + 600,

  notes: {
    walletTransactionId: transaction._id.toString(),
    userId: user._id.toString(),
    company: "One Prime Studios",
  },
});


  // 3️⃣ Save Razorpay reference
  transaction.referenceId = qr.id;
  await transaction.save();

  return res.status(200).json({
    success: true,
    transactionId: transaction._id,
    qrId: qr.id,
    qrImage: qr.image_url,
    amount,
    expiresAt: qr.close_by * 1000,
  });
}





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

//   // 2️⃣ Create Razorpay QR
//   const qr = await razorpay.qrCode.create({
//     type: "upi_qr",
//     name: `Wallet Top-Up - ${user.name}`,
//     usage: "single_use",
//     fixed_amount: true,
//     payment_amount: amount * 100, // paise
//     description: `Wallet Top-Up | Txn ${transaction._id}`,
//     close_by: Math.floor(Date.now() / 1000) + 600, // 10 minutes
//     notes: {
//       walletTransactionId: transaction._id.toString(),
//       userId: user._id.toString(),
//     },
//   });

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
