import mongoose from "mongoose";

const PartnerWalletSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  balance: { type: Number, default: 0 },
  transactions: [
    {
      amount: Number,
      type: String, // credit / debit
      description: String,
      createdAt: { type: Date, default: Date.now }
    }
  ]
});

export default mongoose.models.PartnerWallet ||
 mongoose.model("PartnerWallet", PartnerWalletSchema);
