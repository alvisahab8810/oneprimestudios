import mongoose from "mongoose";

const WalletTopupRequestSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.WalletTopupRequest ||
  mongoose.model("WalletTopupRequest", WalletTopupRequestSchema);
