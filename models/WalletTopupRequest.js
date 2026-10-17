import mongoose from "mongoose";

// A partner who pays by bank transfer instead of the online QR raises one of
// these. Nothing reaches their wallet until an admin approves it.
const WalletTopupRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      unique: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    paymentMode: {
      type: String,
      enum: ["NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash Deposit"],
      required: true,
    },

    // UTR / transaction reference the bank gave the partner
    referenceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    // Optional: the partner may send the screenshot on WhatsApp instead
    screenshotUrl: {
      type: String,
      default: "",
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    adminRemarks: {
      type: String,
      default: "",
      trim: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    // The credit entry written into the partner's statement on approval
    walletTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null,
    },
  },
  { timestamps: true }
);

// A partner should not be able to file the same bank reference twice
WalletTopupRequestSchema.index(
  { user: 1, referenceNumber: 1 },
  { unique: true }
);

WalletTopupRequestSchema.pre("validate", function (next) {
  if (!this.requestNumber) {
    const stamp = Date.now().toString(36).toUpperCase();
    const salt = Math.floor(Math.random() * 1296)
      .toString(36)
      .toUpperCase()
      .padStart(2, "0");
    this.requestNumber = `MT-${stamp}${salt}`;
  }
  next();
});

export default mongoose.models.WalletTopupRequest ||
  mongoose.model("WalletTopupRequest", WalletTopupRequestSchema);
