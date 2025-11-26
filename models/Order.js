

import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
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

    status: {
      type: String,
      enum: [
        "Pending",
        "Order Received",
        "In Packaging",
        // NEW STATUS
        "Order Ready",
  
        "In Progress",
        "Design Approved",
        "Design Rejected",
        "Printing",
        "Order Dispatched",
        "Order Delivered",
        "Processing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Rejected",
      ],
      default: "Pending",
    },


    // NEW FIELD
dispatchRequest: {
  type: String,
  enum: ["none", "pending", "approved"],
  default: "none",
},


    uploadedFiles: [{ type: String }],
    remarks: { type: String, default: "" }, // ✅ Added remarks
    orderNumber: { type: String, unique: true },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
