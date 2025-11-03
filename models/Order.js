// // models/Order.js
// import mongoose from "mongoose";

// const OrderSchema = new mongoose.Schema(
//   {
//     user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     items: [
//       {
//         product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
//         quantity: { type: Number, default: 1 },
//         price: { type: Number, required: true },
//       },
//     ],
//     shipping: {
//       name: String,
//       phone: String,
//       street: String,
//       city: String,
//       state: String,
//       zip: String,
//     },
//     paymentMethod: { type: String, default: "Cash on Delivery" },
//     total: { type: Number, required: true },
//     status: { type: String, default: "Pending" },
//       orderNumber: { type: String, unique: true }, // ✅ new readable order ID
//   },
//   { timestamps: true }
// );

// export default mongoose.models.Order || mongoose.model("Order", OrderSchema);






// // models/Order.js
// import mongoose from "mongoose";

// const OrderSchema = new mongoose.Schema(
//   {
//     user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     items: [
//       {
//         product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
//         quantity: { type: Number, default: 1 },
//         price: { type: Number, required: true },
//       },
//     ],
//     shipping: {
//       name: String,
//       phone: String,
//       street: String,
//       city: String,
//       state: String,
//       zip: String,
//     },
//     paymentMethod: { type: String, default: "Cash on Delivery" },
//     total: { type: Number, required: true },

//     // ✅ Expanded statuses to match frontend
//     status: {
//       type: String,
//       enum: [
//         "Pending",
//         "Order Received",
//         "Design Approved",
//         "Design Rejected",
//         "In Progress",
//         "In Packaging",
//         "Order Dispatched",
//         "Order Delivered",
//         "Cancelled",
//       ],
//       default: "Pending",
//     },

//     orderNumber: { type: String, unique: true },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.Order || mongoose.model("Order", OrderSchema);



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
    status: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "In Progress",
        "Design Approved",
        "Design Rejected", // ✅ Added this
        "Printing",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Rejected",
      ],
      default: "Pending",
    },

      uploadedFiles: [{ type: String }],
    remarks: { type: String, default: "" }, // ✅ Added remarks
    orderNumber: { type: String, unique: true },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
