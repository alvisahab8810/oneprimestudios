import mongoose from "mongoose";

// A return, exchange or refund request raised by a B2C customer for a
// delivered order. All three share this one record and one admin panel,
// because the first half of the journey — approve, collect the item, check
// it — is identical. They part ways afterwards: money goes back on a
// return/refund, a replacement goes out on an exchange.
// Partners (B2B) are not allowed to raise these — see lib/returnRules.js.
const ReturnRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, default: "" },
    requestNumber: { type: String, unique: true },

    type: {
      type: String,
      enum: ["return", "exchange", "refund"],
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
        "Replacement Shipped",
        "Replacement Delivered",
        "Closed",
      ],
      default: "Requested",
    },

    adminRemarks: { type: String, default: "" },

    // Filled on an exchange: what the buyer wants instead, and how the
    // replacement is travelling back to them. Stays empty on a return or
    // refund request.
    exchange: {
      // What the customer asked for in place of the item they received
      preference: { type: String, default: "" },
      // The replacement shipment. Booked outside the app today, so the
      // courier name and tracking number are recorded by hand.
      courier: { type: String, default: "" },
      awb: { type: String, default: "" },
      shippedAt: { type: Date },
      deliveredAt: { type: Date },
      note: { type: String, default: "" },
    },

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
    // An exchange carries its own prefix, so the number itself says which
    // kind of request it is wherever it is quoted.
    const prefix = this.type === "exchange" ? "EXC" : "RET";
    this.requestNumber = `${prefix}-${stamp}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export default mongoose.models.ReturnRequest ||
  mongoose.model("ReturnRequest", ReturnRequestSchema);
