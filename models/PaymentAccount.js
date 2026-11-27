// models/PaymentAccount.js
// A bank account (and its UPI QR code) that partners pay into when they top up
// their wallet manually. Admins can keep several; the one marked as shown is
// what the partner "Manual Payment" page displays.
import mongoose from "mongoose";

const PaymentAccountSchema = new mongoose.Schema(
  {
    // Admin-only name to tell accounts apart, e.g. "UCO current account"
    label: { type: String, trim: true, maxlength: 80, default: "" },

    firmName: { type: String, trim: true, maxlength: 120, required: true },
    bankName: { type: String, trim: true, maxlength: 120, required: true },
    accountNumber: { type: String, trim: true, maxlength: 34, required: true },
    accountType: { type: String, trim: true, maxlength: 40, default: "" },
    ifsc: { type: String, trim: true, uppercase: true, maxlength: 11, required: true },
    branch: { type: String, trim: true, maxlength: 120, default: "" },
    branchAddress: { type: String, trim: true, maxlength: 300, default: "" },

    upiId: { type: String, trim: true, maxlength: 80, default: "" },
    qrImage: { type: String, trim: true, default: "" },
    whatsappNumber: { type: String, trim: true, maxlength: 20, default: "" },

    // Only one account is shown to partners at a time
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PaymentAccountSchema.index({ isActive: 1, updatedAt: -1 });

export default mongoose.models.PaymentAccount ||
  mongoose.model("PaymentAccount", PaymentAccountSchema);
