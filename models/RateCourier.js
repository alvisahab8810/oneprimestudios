// models/RateCourier.js — the couriers a partner can pick on the rate list.
// Each one carries its own delivery charge, so the quoted price changes with
// the courier the partner chooses, the same way the printed rate card works.
import mongoose from "mongoose";

const RateCourierSchema = new mongoose.Schema(
  {
    // Shown in the "Select Courier" dropdown, e.g. "DTDC Surface - North Zone"
    name: { type: String, required: true, trim: true },

    // Added once to every row, whatever the weight
    baseCharge: { type: Number, default: 0 },
    // Added for each kilogram of the row's shipment weight, rounded up
    perKg: { type: Number, default: 0 },

    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.RateCourier ||
  mongoose.model("RateCourier", RateCourierSchema);
