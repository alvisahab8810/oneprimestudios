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

    // "refunded" is set by an admin after the money has been sent back to the
    // partner's bank account, whether or not it ever reached the wallet.
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "refunded"],
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

    // Filled in when the money is returned to the partner's bank account. The
    // status it is refunded from is kept so the history still reads correctly:
    // a refund after an approval also takes the amount back out of the wallet,
    // a refund after a rejection moves nothing.
    refund: {
      amount: { type: Number, default: 0 },
      // How the money was sent back (NEFT, UPI, …) and its bank reference
      mode: { type: String, default: "", trim: true },
      reference: { type: String, default: "", trim: true },
      remarks: { type: String, default: "", trim: true },
      refundedFrom: { type: String, default: "" },
      at: { type: Date, default: null },
      by: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
      // The debit entry written when a credited top-up is refunded
      walletTransaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WalletTransaction",
        default: null,
      },
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
