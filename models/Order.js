// models/Order.js
import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, default: 1 },
        price: { type: Number, required: true },
      },
    ],
    shipping: {
      name: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      zip: String,
    },
    paymentMethod: { type: String, default: "Cash on Delivery" },
    total: { type: Number, required: true },
    status: { type: String, default: "Pending" },
      orderNumber: { type: String, unique: true }, // ✅ new readable order ID
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
