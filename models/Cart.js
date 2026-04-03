// models/Cart.js
// FIX: Added uploadedAttributeFiles to CartItemSchema.
// Mongoose silently strips fields not defined in the schema.
// Without this, uploadedAttributeFiles was saved by the API but
// immediately dropped on read — so checkout always sent empty arrays.

import mongoose from "mongoose";

const CartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity:     { type: Number, default: 1 },
  selectedAttrs: { type: Object, default: {} },
  uploadedFiles: { type: [String], default: [] },

  // FIX: this field was missing — Mongoose was silently dropping it on save
  uploadedAttributeFiles: {
    type: [
      {
        attributeName: { type: String, default: "" },
        name:          { type: String, default: "" },
        url:           { type: String, default: "" },
      },
    ],
    default: [],
  },

  price:   { type: Number, required: true },
  remarks: { type: String, default: "" },
  // NEW: mandatory order name entered by B2B customer
  orderName: { type: String, default: "" },
});

const CartSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [CartItemSchema],
});

export default mongoose.models.Cart || mongoose.model("Cart", CartSchema);


// import mongoose from "mongoose";

// const CartItemSchema = new mongoose.Schema({
//   product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
//   quantity: { type: Number, default: 1 },
//   selectedAttrs: { type: Object, default: {} },
//   uploadedFiles: { type: [String], default: [] },
//   price: { type: Number, required: true },
//   remarks: { type: String, default: "" },

// });

// const CartSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   items: [CartItemSchema],
// });

// export default mongoose.models.Cart || mongoose.model("Cart", CartSchema);
