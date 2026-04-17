// models/Invoice.js
import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, required: true },

    // ── Order reference ───────────────────────────────────────────────────────
    orderId:      { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber:  { type: String, required: true },
    orderNumbers: { type: [String], default: [] }, // all order numbers when invoice covers multiple orders

    // ── Partner snapshot ──────────────────────────────────────────────────────
    partnerId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    partnerName: { type: String, required: true },
    partnerType: { type: String, enum: ["B2B", "B2C", "UNREGISTERED"], default: "B2B" },
    // B2B = has GST number | B2C = individual no GST | UNREGISTERED = no GST

    partnerAddress: {
      name:        String,
      companyName: String,
      gst:         String,   // GSTIN of partner
      phone:       String,
      email:       String,
      street:      String,
      city:        String,
      state:       String,
      stateCode:   String,   // e.g. "09" for UP — needed for GST returns
      zip:         String,
    },

    // ── Invoice date (manual override) ───────────────────────────────────────
    invoiceDate: { type: Date, default: null },

    // ── Ship To / Consignee (can differ from Bill To) ─────────────────────────
    shipToAddress: {
      name:        String,
      companyName: String,
      gst:         String,
      phone:       String,
      street:      String,
      city:        String,
      state:       String,
      zip:         String,
    },

    // ── Seller info (your company) ────────────────────────────────────────────
    sellerGst:     { type: String, default: "09CORPG5317P1Z6" },
    sellerAddress: { type: String, default: "591/eya/19 kumhar mandi, Kharika telibagh Lucknow" },

    // ── Invoice items with HSN ────────────────────────────────────────────────
    items: [
      {
        description:   String,
        hsnCode:       { type: String, default: "" },  // HSN/SAC code
        qty:           Number,
        rate:          Number,
        taxableAmount: Number,  // = qty × rate (before tax)
        amount:        Number,  // final amount after tax
      }
    ],

    // ── Tax breakdown ─────────────────────────────────────────────────────────
    subTotal:      Number,   // sum of taxableAmount across all items
    taxableValue:  Number,   // same as subTotal (explicit field for GST returns)

    gstPercent:    Number,   // total GST %  e.g. 18
    cgstPercent:   Number,   // e.g. 9  (intra-state: CGST = SGST = half of GST)
    sgstPercent:   Number,   // e.g. 9
    igstPercent:   Number,   // e.g. 18 (inter-state: IGST = full GST, CGST/SGST = 0)

    cgstAmount:    Number,
    sgstAmount:    Number,
    igstAmount:    Number,
    gstAmount:     Number,   // total tax = cgst+sgst OR igst

    grandTotal:    Number,   // taxableValue + gstAmount

    // ── GST type (intra vs inter state) ───────────────────────────────────────
    gstType: {
      type: String,
      enum: ["INTRA", "INTER", "NONE"],
      default: "INTRA",
      // INTRA → show CGST + SGST columns
      // INTER → show IGST column
      // NONE  → no GST (unregistered / B2C below ₹2.5L)
    },

    // ── Payment snapshot ──────────────────────────────────────────────────────
    paymentSnapshot: {
      paymentMethod:  String,
      paymentStatus:  String,
      transactionId:  String,
    },

    remarks:     { type: String, default: "" },
    declaration: { type: String, default: "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.\nGoods Once Sold Will Not be Taken back. All disputes are subject to Lucknow's Jurisdiction." },

    status: {
      type: String,
      enum: ["DRAFT", "SENT", "UPDATED", "CANCELLED"],
      default: "DRAFT",
    },

    sentAt:    { type: Date, default: null },
    pdfUrl:    { type: String, default: "" },
    createdBy: { type: String, default: "ADMIN" },

    walletTxnId: { type: mongoose.Schema.Types.ObjectId, ref: "WalletTransaction", default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Invoice || mongoose.model("Invoice", invoiceSchema);

// import mongoose from "mongoose";

// const invoiceSchema = new mongoose.Schema(
//   {
//     invoiceNumber: {
//       type: String,
//       unique: true,
//       required: true
//     },

//     // 🔹 Order snapshot
//     orderId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Order",
//       required: true
//     },

//     orderNumber: {
//       type: String,
//       required: true
//     },

//     // 🔹 Partner snapshot (stored as USER)
//     partnerId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true
//     },

//     partnerName: {
//       type: String,
//       required: true
//     },
// partnerAddress: {
//   name: String,
//   companyName: String,   // ✅ ADD THIS
//   gst: String,           // ✅ ADD THIS

//   phone: String,
//   email: String,

//   street: String,
//   city: String,
//   state: String,
//   zip: String
// },


//     walletTxnId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "WalletTransaction",
//       default: null
//     },

//     // 🔹 Invoice items snapshot
//     items: [
//       {
//         description: String,
//         qty: Number,
//         rate: Number,
//         amount: Number
//       }
//     ],

//     subTotal: Number,
//     gstPercent: Number,
//     gstAmount: Number,
//     grandTotal: Number,

//     remarks: {
//       type: String,
//       default: ""
//     },

//     status: {
//       type: String,
//       enum: ["DRAFT", "SENT", "UPDATED", "CANCELLED"],
//       default: "DRAFT"
//     },


//     paymentSnapshot: {
//   paymentMethod: String,
//   paymentStatus: String,
//   transactionId: String
// },


//     pdfUrl: {
//       type: String,
//       default: ""
//     },

//     createdBy: {
//       type: String,
//       default: "ADMIN"
//     }
//   },
//   { timestamps: true }
// );

// export default mongoose.models.Invoice ||
//   mongoose.model("Invoice", invoiceSchema);
