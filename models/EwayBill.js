// models/EwayBill.js
// Based on GST Form EWB-01: Part A (consignment) + Part B (transport).
// One invoice = one e-way bill. Mandatory for consignments above ₹50,000.
import mongoose from "mongoose";

const addressSchema = { street: String, city: String, state: String, pincode: String };

const ewayBillSchema = new mongoose.Schema(
  {
    invoiceId:     { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", required: true, unique: true },
    invoiceNumber: { type: String, required: true },

    // 12-digit number issued by the NIC portal (ewaybillgst.gov.in). Generated on the
    // portal and entered here — without it the bill stays in DRAFT.
    ewbNumber:   { type: String, default: "" },
    generatedAt: { type: Date, default: null }, // generated date & time as shown on the portal
    validUpto:   { type: Date, default: null },

    // ── PART A ────────────────────────────────────────────────────────────────
    supplyType:      { type: String, enum: ["OUTWARD", "INWARD"], default: "OUTWARD" },
    subSupplyType:   { type: String, default: "Supply" },       // Supply / Export / Job Work / ...
    documentType:    { type: String, default: "Tax Invoice" },  // Tax Invoice / Bill of Supply / Delivery Challan
    transactionType: { type: String, default: "Regular" },      // Regular / Bill To-Ship To / Bill From-Dispatch From / Combination

    billTo:       { gstin: String, name: String, state: String }, // recipient (GSTIN or URP)
    dispatchFrom: addressSchema,
    shipTo:       addressSchema,

    // Goods lines — snapshot of invoice items; HSN, quantity and unit (UQC) are editable
    goods: [
      {
        _id: false,
        hsnCode:       String,
        description:   String,
        qty:           Number,
        unit:          { type: String, default: "NOS" },
        taxableAmount: Number,
        gstPercent:    Number,
      },
    ],

    // ── PART B ────────────────────────────────────────────────────────────────
    transportMode:     { type: String, enum: ["Road", "Rail", "Air", "Ship"], default: "Road" },
    vehicleType:       { type: String, enum: ["Regular", "ODC"], default: "Regular" }, // ODC = Over Dimensional Cargo
    vehicleNumber:     { type: String, default: "" },
    transporterName:   { type: String, default: "" },
    transporterId:     { type: String, default: "" }, // GSTIN / TRANSIN
    transportDocNo:    { type: String, default: "" }, // LR / RR / AWB / BL no.
    transportDocDate:  { type: Date, default: null },
    distanceKm:        { type: Number, default: 0 },
    cewbNumber:        { type: String, default: "" }, // consolidated e-way bill no., if any

    status: { type: String, enum: ["DRAFT", "GENERATED", "CANCELLED"], default: "DRAFT" },
    pdfUrl: { type: String, default: "" },
    sentAt: { type: Date, default: null },
    sentTo: { type: String, default: "" }, // last email address the e-way bill was sent to
  },
  { timestamps: true }
);

export default mongoose.models.EwayBill || mongoose.model("EwayBill", ewayBillSchema);
