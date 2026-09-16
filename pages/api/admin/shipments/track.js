// pages/api/admin/shipments/track.js
// Pulls the latest courier scans for one order and saves them on the order.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { requireAdminPermission } from "@/lib/adminAuth";
import { trackByAwb, isShiprocketConfigured, ShiprocketError } from "@/lib/shiprocket";
import { mapCourierStatusToOrderStatus } from "@/lib/shipmentPayload";

// Shiprocket returns the tracking block under a couple of shapes
function readTracking(data) {
  const block = data?.tracking_data || data?.[0]?.tracking_data || {};
  const activities = block.shipment_track_activities || [];
  const track = (block.shipment_track || [])[0] || {};
  return {
    status: track.current_status || block.shipment_status || "",
    statusCode: Number(block.shipment_status) || undefined,
    trackUrl: block.track_url || "",
    expectedDeliveryDate: track.edd || "",
    history: activities
      .map((a) => ({
        status: a.status || "",
        activity: a["sr-status-label"] || a.activity || "",
        location: a.location || "",
        date: a.date ? new Date(a.date) : undefined,
      }))
      .reverse(), // oldest first
  };
}

export async function refreshTracking(order) {
  const awb = order?.shipment?.awbCode;
  if (!awb) return null;

  const data = await trackByAwb(awb);
  const t = readTracking(data);

  order.shipment.status = t.status || order.shipment.status;
  if (t.statusCode) order.shipment.statusCode = t.statusCode;
  if (t.trackUrl) order.shipment.trackingUrl = t.trackUrl;
  if (t.expectedDeliveryDate) order.shipment.expectedDeliveryDate = new Date(t.expectedDeliveryDate);
  if (t.history.length) order.shipment.trackingHistory = t.history;
  order.shipment.lastTrackedAt = new Date();

  const mapped = mapCourierStatusToOrderStatus(t.status);
  if (mapped && order.status !== mapped && !["Cancelled", "Rejected"].includes(order.status)) {
    order.status = mapped;
    if (mapped === "Order Delivered" && !order.deliveredAt) order.deliveredAt = new Date();
  }
  await order.save();
  return order.shipment;
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const admin = await requireAdminPermission(req, res, "orders");
    if (!admin) return;

    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: "Shiprocket is not set up yet" });
    }

    const orderId = req.body?.orderId || req.query?.orderId;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.shipment?.awbCode) return res.status(400).json({ message: "No shipment has been booked for this order" });

    const shipment = await refreshTracking(order);
    return res.status(200).json({ shipment, status: order.status });
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return res.status(err.status === 401 ? 502 : err.status).json({ message: err.message });
    }
    console.error("Track shipment error:", err);
    return res.status(500).json({ message: "Could not fetch tracking details" });
  }
}
