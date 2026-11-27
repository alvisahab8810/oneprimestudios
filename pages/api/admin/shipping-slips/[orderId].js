// pages/api/admin/shipping-slips/[orderId].js
// PATCH { boxes, weightKg, dimensions, note } → saves the packing details
// printed on this order's slip. Creates the slip record on first save.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import ShippingSlip from "@/models/ShippingSlip";
import { requireAdminPermission } from "@/lib/adminAuth";
import { MAX_BOXES, MAX_NOTE, MAX_DIMENSIONS } from "@/lib/shippingSlips";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ message: "Method not allowed" });
  }
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "shipping_slips");
  if (!admin) return;

  const { orderId } = req.query;
  if (!mongoose.Types.ObjectId.isValid(orderId || "")) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  const body = req.body || {};
  const update = {};

  if (body.boxes !== undefined) {
    const boxes = parseInt(body.boxes, 10);
    if (!Number.isFinite(boxes) || boxes < 1 || boxes > MAX_BOXES) {
      return res.status(400).json({ message: `Boxes must be between 1 and ${MAX_BOXES}` });
    }
    update.boxes = boxes;
  }
  if (body.weightKg !== undefined) {
    const weight = body.weightKg === "" ? 0 : Number(body.weightKg);
    if (!Number.isFinite(weight) || weight < 0 || weight > 1000) {
      return res.status(400).json({ message: "Enter a weight between 0 and 1000 kg" });
    }
    update.weightKg = Math.round(weight * 1000) / 1000;
  }
  if (body.dimensions !== undefined) update.dimensions = String(body.dimensions || "").trim().slice(0, MAX_DIMENSIONS);
  if (body.note !== undefined) update.note = String(body.note || "").trim().slice(0, MAX_NOTE);

  try {
    const order = await Order.findById(orderId).select("_id orderNumber").lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    const slip = await ShippingSlip.findOneAndUpdate(
      { order: order._id },
      { $set: { ...update, orderNumber: order.orderNumber || "" } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();

    return res.json({ success: true, slip });
  } catch (err) {
    console.error("Shipping slip save error:", err);
    return res.status(500).json({ message: "Could not save the slip details" });
  }
}
