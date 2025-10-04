// models/Order.js
import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional if logged in
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    selectedOptions: { type: Object }, // any selected option (color, finish etc)
    files: [{ type: String }], // file paths uploaded for order
    cost: { type: Number },
    gst: { type: Number },
    amountPayable: { type: Number },
    status: { type: String, default: "pending" }, // pending/processing/completed
    shippingAddress: { type: Object },
    billingAddress: { type: Object },
    notes: { type: String }
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
