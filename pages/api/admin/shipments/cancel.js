// pages/api/admin/shipments/cancel.js
// Cancels a booked shipment (and the Shiprocket order) so the courier stops the pickup.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { requireAdminPermission } from "@/lib/adminAuth";
import { logActivity } from "@/lib/logActivity";
import {
  cancelShipment, cancelShiprocketOrder, isShiprocketConfigured, ShiprocketError,
} from "@/lib/shiprocket";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const admin = await requireAdminPermission(req, res, "orders");
    if (!admin) return;

    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: "Shiprocket is not set up yet" });
    }

    const { orderId } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.shipment?.shipmentId && !order.shipment?.awbCode) {
      return res.status(400).json({ message: "No shipment has been booked for this order" });
    }
    if (order.shipment?.cancelledAt) {
      return res.status(400).json({ message: "This shipment is already cancelled" });
    }

    // The AWB has to go first, otherwise the courier keeps the pickup on its list
    if (order.shipment.awbCode) {
      await cancelShipment({ awb: order.shipment.awbCode });
    }
    if (order.shipment.shiprocketOrderId) {
      try {
        await cancelShiprocketOrder({ shiprocketOrderId: order.shipment.shiprocketOrderId });
      } catch (orderErr) {
        // The parcel is already stopped; the order row on Shiprocket can be closed by hand
        console.error("Shiprocket order cancel error:", orderErr?.message);
      }
    }

    const cancelledAwb = order.shipment.awbCode;
    order.shipment.awbCode = "";
    order.shipment.courierName = "";
    order.shipment.courierId = "";
    order.shipment.labelUrl = "";
    order.shipment.manifestUrl = "";
    order.shipment.pickupScheduledAt = undefined;
    order.shipment.pickupTokenNumber = "";
    order.shipment.status = "Cancelled";
    order.shipment.cancelledAt = new Date();
    await order.save();

    logActivity(req, "shipment_cancelled",
      `Shipment cancelled for order #${order.orderNumber || order._id} (AWB ${cancelledAwb || "none"})`,
      { entity: "order", entityId: String(order._id), meta: { awbCode: cancelledAwb } }
    );

    return res.status(200).json({ message: "Shipment cancelled", shipment: order.shipment });
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return res.status(err.status === 401 ? 502 : err.status).json({ message: err.message });
    }
    console.error("Cancel shipment error:", err);
    return res.status(500).json({ message: "Could not cancel the shipment" });
  }
}
