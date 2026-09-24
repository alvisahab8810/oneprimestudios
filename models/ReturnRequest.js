import mongoose from "mongoose";

// A return / refund request raised by a B2C customer for a delivered order.
// Partners (B2B) are not allowed to raise these — see lib/returnRules.js.
const ReturnRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, default: "" },
    requestNumber: { type: String, unique: true },

    type: {
      type: String,
      enum: ["return", "refund"],
      default: "return",
    },

    reason: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    images: [{ type: String }], // up to 5 photos of the fault

    status: {
      type: String,
      enum: [
        "Requested",
        "Approved",
        "Rejected",
        "Pickup Scheduled",
        "Item Received",
        "Refunded",
        "Closed",
      ],
      default: "Requested",
    },

    adminRemarks: { type: String, default: "" },

    // Filled when the money actually goes back to the customer
    refund: {
      amount: { type: Number, default: 0 },
      method: {
        type: String,
        enum: ["Razorpay", "Bank Transfer", "UPI", "Wallet", "Other", ""],
        default: "",
      },
      reference: { type: String, default: "" }, // Razorpay refund id or bank UTR
      // Gateway refunds are asynchronous: "pending" until the Razorpay refund
      // webhook confirms it. Manual refunds are recorded as "processed".
      status: {
        type: String,
        enum: ["pending", "processed", "failed", ""],
        default: "",
      },
      refundedAt: { type: Date },
      failureReason: { type: String, default: "" },
      note: { type: String, default: "" },
    },

    // Every status change is kept so both sides can see what happened when
    history: [
      {
        status: { type: String },
        remarks: { type: String, default: "" },
        by: { type: String, default: "admin" }, // "customer" or "admin"
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ReturnRequestSchema.pre("save", async function (next) {
  if (!this.requestNumber) {
    const count = await mongoose.model("ReturnRequest").countDocuments();
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    this.requestNumber = `RET-${stamp}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export default mongoose.models.ReturnRequest ||
  mongoose.model("ReturnRequest", ReturnRequestSchema);
