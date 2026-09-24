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
//     // paymentMethod: { type: String, default: "Cash on Delivery" },
//     paymentMethod: {
//       type: String,
//       enum: ["Wallet", "Razorpay"],
//       required: true,
//     },

//     razorpay: {
//       orderId: String,
//       paymentId: String,
//       signature: String,
//     },

//     cancelledBy: {
//       type: String,
//       enum: ["admin", "partner", "system"],
//     },

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
//     dispatchRequest: {
//       type: String,
//       enum: ["none", "pending", "approved"],
//       default: "none",
//     },

//     // DELIVERY CHALLAN (B2B)
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
//       type: String,
//       enum: ["UNPAID", "PAID", "REFUNDED"],
//       default: "UNPAID",
//     },

//     refundedAt: Date,

//     coupon: {
//       code: { type: String },
//       discountType: { type: String },
//       discountValue: { type: Number },
//       discountAmount: { type: Number },
//     },

//     subtotal: { type: Number, required: true },

//     uploadedFiles: [{ type: String }],

//     reuploadedFiles: [
//       {
//         fileUrl: String,
//         uploadedAt: { type: Date, default: Date.now },
//       },
//     ],

//     remarks: { type: String, default: "" }, // ✅ Added remarks

//     customerRemarks: { type: String, default: "" },

//     orderNumber: { type: String, unique: true },
//   },

//   { timestamps: true },
// );

// export default mongoose.models.Order || mongoose.model("Order", OrderSchema);




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

    // Snapshot of product name at time of order — preserved even if product is deleted
    productName: { type: String, default: "" },

    quantity: {
      type: Number,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    // OLD: selectedAttrs was missing — got dropped when order was created from cart
    // NEW: stored so admin can see what options the customer selected
    selectedAttrs: { type: Object, default: {} },

    // ✅ REQUIRED FOR PRINT FILES
    uploadedFiles: {
      type: [String],
      default: [],
    },

    uploadedAttributeFiles: {
      type: [
        {
          attributeName: String,
          name: String,
          url: String,
        },
      ],
      default: [],
    },

    remarks: {
      type: String,
      default: "",
    },
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
      // Captured amount in paise, exactly as Razorpay reported it
      amountPaid: { type: Number },
      capturedAt: { type: Date },
    },

    // Every refund raised against this order, gateway or manual. Refunds at the
    // gateway are asynchronous, so the webhook flips status to processed/failed.
    refunds: [
      {
        returnRequest: { type: mongoose.Schema.Types.ObjectId, ref: "ReturnRequest" },
        amount: { type: Number, required: true },
        method: {
          type: String,
          enum: ["Razorpay", "Bank Transfer", "UPI", "Wallet", "Other"],
          required: true,
        },
        reference: { type: String, default: "" }, // Razorpay refund id or bank UTR
        status: {
          type: String,
          enum: ["pending", "processed", "failed"],
          default: "processed",
        },
        note: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
        settledAt: { type: Date },
      },
    ],

    cancelledBy: {
      type: String,
      enum: ["admin", "partner", "system"],
    },

    total: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 }, // GST included in total

    // What the courier quoted for this delivery, charged to the customer as "Transport Charge"
    shippingCharge: { type: Number, default: 0 },
    shippingQuote: {
      courierName: { type: String, default: "" },
      pincode: { type: String, default: "" },
      weight: { type: Number, default: 0 },
      quotedAt: { type: Date },
    },

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

    // Mirrors the latest return/refund request on this order, so the admin
    // order list can be filtered without a second query. "none" = no request.
    returnStatus: {
      type: String,
      enum: [
        "none",
        "Requested",
        "Approved",
        "Rejected",
        "Pickup Scheduled",
        "Item Received",
        "Refunded",
        "Closed",
      ],
      default: "none",
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


    walletTxnId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "WalletTransaction",
},


    refundedAt: Date,

    coupon: {
      code: { type: String },
      discountType: { type: String },
      discountValue: { type: Number },
      discountAmount: { type: Number },
    },

    subtotal: { type: Number, required: true },


    reuploadedFiles: [
      {
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    remarks: { type: String, default: "" }, // ✅ Added remarks

    customerRemarks: { type: String, default: "" },

    // NEW: order name entered by B2B customer on product page (mandatory)
    orderName: { type: String, default: "" },

    // NEW: courier shipment booked through Shiprocket
    shipment: {
      provider: { type: String, default: "shiprocket" },
      shiprocketOrderId: { type: String, default: "" },
      shipmentId: { type: String, default: "" },
      awbCode: { type: String, default: "" },
      courierName: { type: String, default: "" },
      courierId: { type: String, default: "" },
      freightCharge: { type: Number, default: 0 },
      appliedWeight: { type: Number, default: 0 },
      pickupLocation: { type: String, default: "" },
      pickupScheduledAt: { type: Date },
      pickupTokenNumber: { type: String, default: "" },
      labelUrl: { type: String, default: "" },
      manifestUrl: { type: String, default: "" },
      expectedDeliveryDate: { type: Date },
      // Latest status reported by the courier
      status: { type: String, default: "" },
      statusCode: { type: Number },
      trackingUrl: { type: String, default: "" },
      lastTrackedAt: { type: Date },
      // Full history of courier scans, newest last
      trackingHistory: [
        {
          status: String,
          activity: String,
          location: String,
          date: Date,
        },
      ],
      cancelledAt: { type: Date },
      createdAt: { type: Date },
    },

    orderNumber: { type: String, unique: true },
  },

  { timestamps: true },
);

// One Razorpay payment can back exactly one order. This is what stops the same
// captured payment from being replayed into a second order.
OrderSchema.index(
  { "razorpay.paymentId": 1 },
  { unique: true, sparse: true, partialFilterExpression: { "razorpay.paymentId": { $type: "string" } } }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
