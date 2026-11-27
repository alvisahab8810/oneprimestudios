// models/ShippingSlip.js — the box label for one order.
// The slip itself is drawn from the order (address, items, payment) every time
// it is printed, so a later address fix on the order shows on a reprint. This
// record keeps only what the packing desk adds and when the slip was printed.
import mongoose from "mongoose";

const ShippingSlipSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    orderNumber: { type: String, default: "" },

    // Packing details printed on the slip
    boxes: { type: Number, default: 1, min: 1, max: 50 }, // one slip per box
    weightKg: { type: Number, default: 0, min: 0 },
    dimensions: { type: String, default: "" }, // e.g. "30 x 20 x 10 cm"
    note: { type: String, default: "" }, // e.g. "Fragile - handle with care"

    printCount: { type: Number, default: 0 },
    firstPrintedAt: { type: Date },
    lastPrintedAt: { type: Date },
    lastPrintedBy: { type: String, default: "" },
    // Latest prints, newest last, capped at 20
    printLog: [
      {
        at: { type: Date, default: Date.now },
        by: { type: String, default: "" },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.ShippingSlip || mongoose.model("ShippingSlip", ShippingSlipSchema);
