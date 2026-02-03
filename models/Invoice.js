import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true
    },

    // 🔹 Order snapshot
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },

    orderNumber: {
      type: String,
      required: true
    },

    // 🔹 Partner snapshot (stored as USER)
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    partnerName: {
      type: String,
      required: true
    },
partnerAddress: {
  name: String,
  companyName: String,   // ✅ ADD THIS
  gst: String,           // ✅ ADD THIS

  phone: String,
  email: String,

  street: String,
  city: String,
  state: String,
  zip: String
},


    walletTxnId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
      default: null
    },

    // 🔹 Invoice items snapshot
    items: [
      {
        description: String,
        qty: Number,
        rate: Number,
        amount: Number
      }
    ],

    subTotal: Number,
    gstPercent: Number,
    gstAmount: Number,
    grandTotal: Number,

    remarks: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["DRAFT", "SENT", "UPDATED", "CANCELLED"],
      default: "DRAFT"
    },


    paymentSnapshot: {
  paymentMethod: String,
  paymentStatus: String,
  transactionId: String
},


    pdfUrl: {
      type: String,
      default: ""
    },

    createdBy: {
      type: String,
      default: "ADMIN"
    }
  },
  { timestamps: true }
);

export default mongoose.models.Invoice ||
  mongoose.model("Invoice", invoiceSchema);
