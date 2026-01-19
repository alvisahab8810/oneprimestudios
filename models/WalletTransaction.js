import mongoose from "mongoose";

const WalletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    referenceType: {
      type: String,
      enum: [
        "wallet_topup",
        "order_payment",
        "refund",
        "adjustment",
      ],
      required: true,
    },

    referenceId: {
      type: String, // Razorpay payment id / order id
    },

    paymentId: { type: String },


    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.models.WalletTransaction ||
  mongoose.model("WalletTransaction", WalletTransactionSchema);
