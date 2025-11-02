import mongoose from "mongoose";

const CartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, default: 1 },
  selectedAttrs: { type: Object, default: {} },
  uploadedFiles: { type: [String], default: [] },
  price: { type: Number, required: true },
});

const CartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [CartItemSchema],
});

export default mongoose.models.Cart || mongoose.model("Cart", CartSchema);
