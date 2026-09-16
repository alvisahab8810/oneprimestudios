// pages/api/admin/shipments/label.js
// Generates (or regenerates) the shipping label and manifest for a booked shipment.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { requireAdminPermission } from "@/lib/adminAuth";
import { generateLabel, generateManifest, isShiprocketConfigured, ShiprocketError } from "@/lib/shiprocket";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const admin = await requireAdminPermission(req, res, "orders");
    if (!admin) return;

    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: "Shiprocket is not set up yet" });
    }

    const { orderId, type = "label" } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const shipmentId = order.shipment?.shipmentId;
    if (!shipmentId) return res.status(400).json({ message: "No shipment has been booked for this order" });

    if (type === "manifest") {
      const data = await generateManifest({ shipmentId });
      const url = data?.manifest_url || "";
      if (!url) return res.status(502).json({ message: data?.message || "Shiprocket did not return a manifest" });
      order.shipment.manifestUrl = url;
      await order.save();
      return res.status(200).json({ url, shipment: order.shipment });
    }

    const data = await generateLabel({ shipmentId });
    const url = data?.label_url || "";
    if (!url) return res.status(502).json({ message: data?.message || "Shiprocket did not return a label" });
    order.shipment.labelUrl = url;
    await order.save();
    return res.status(200).json({ url, shipment: order.shipment });
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return res.status(err.status === 401 ? 502 : err.status).json({ message: err.message });
    }
    console.error("Shipment label error:", err);
    return res.status(500).json({ message: "Could not generate the document" });
  }
}
