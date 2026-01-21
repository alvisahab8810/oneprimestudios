

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
    // paymentMethod: { type: String, default: "Cash on Delivery" },
    paymentMethod: {
  type: String,
  enum: ["Wallet", "Razorpay"],
  required: true,
},


razorpay: {
  orderId: String,
  paymentId: String,
  signature: String,
},


cancelledBy: {
  type: String,
  enum: ["admin", "partner", "system"],
},


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


         // DELIVERY CHALLAN (B2B)
    deliveryChallan: {
      fileUrl: { type: String },
      uploadedAt: { type: Date },
    },

    deliveryRemarks: {
      type: String,
      default: "",
    },

    deliveredAt: {
      type: Date,
    },



    paymentStatus: {
  type: String,
  enum: ["UNPAID", "PAID", "REFUNDED"],
  default: "UNPAID",
},

refundedAt: Date,



  coupon: {
  code: { type: String },
  discountType: { type: String },
  discountValue: { type: Number },
  discountAmount: { type: Number },
},


      subtotal: { type: Number, required: true },


    uploadedFiles: [{ type: String }],

    reuploadedFiles: [
  {
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now },
  },
],

    remarks: { type: String, default: "" }, // ✅ Added remarks

    customerRemarks: { type: String, default: "" },

    

    orderNumber: { type: String, unique: true },
  },

  
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);



















// import mongoose from "mongoose";

// const OrderSchema = new mongoose.Schema(
//   {
//     user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     items: [
//       {
//         product: {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "Product",
//           required: true,
//         },
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

//     status: {
//       type: String,
//       enum: [
//         "Pending",
//         "Order Received",
//         "In Packaging",
//         // NEW STATUS
//         "Order Ready",
  
//         "In Progress",
//         "Design Approved",
//         "Design Rejected",
//         "Printing",
//         "Order Dispatched",
//         "Order Delivered",
//         "Processing",
//         "Shipped",
//         "Delivered",
//         "Cancelled",
//         "Rejected",
//       ],
//       default: "Pending",
//     },


//     // NEW FIELD
//       dispatchRequest: {
//         type: String,
//         enum: ["none", "pending", "approved"],
//         default: "none",
//       },


//          // DELIVERY CHALLAN (B2B)
//     deliveryChallan: {
//       fileUrl: { type: String },
//       uploadedAt: { type: Date },
//     },

//     deliveryRemarks: {
//       type: String,
//       default: "",
//     },

//     deliveredAt: {
//       type: Date,
//     },



//     paymentStatus: {
//   type: String,
//   enum: ["UNPAID", "PAID", "REFUNDED"],
//   default: "UNPAID",
// },

// refundedAt: Date,



//   coupon: {
//   code: { type: String },
//   discountType: { type: String },
//   discountValue: { type: Number },
//   discountAmount: { type: Number },
// },


//       subtotal: { type: Number, required: true },


//     uploadedFiles: [{ type: String }],

//     reuploadedFiles: [
//   {
//     fileUrl: String,
//     uploadedAt: { type: Date, default: Date.now },
//   },
// ],

//     remarks: { type: String, default: "" }, // ✅ Added remarks

//     customerRemarks: { type: String, default: "" },

    

//     orderNumber: { type: String, unique: true },
//   },

  
//   { timestamps: true }
// );

// export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
