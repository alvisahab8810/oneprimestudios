// pages/api/admin/shipments/create.js
// Books the courier for one order: creates the Shiprocket order, assigns an AWB and asks for pickup.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";
import { requireAdminPermission } from "@/lib/adminAuth";
import { logActivity } from "@/lib/logActivity";
import {
  createShiprocketOrder, assignAwb, requestPickup, generateLabel,
  isShiprocketConfigured, SHIPROCKET_PICKUP_LOCATION, ShiprocketError,
} from "@/lib/shiprocket";
import { buildOrderPayload, suggestPackage, validateShipmentReadiness } from "@/lib/shipmentPayload";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const admin = await requireAdminPermission(req, res, "orders");
    if (!admin) return;

    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: "Shiprocket is not set up yet. Add the API user details on the server." });
    }

    const { orderId, courierId, weight, length, breadth, height, schedulePickup = true } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(orderId)
      .populate("user", "name email phone")
      .populate("items.product", "name sku hsnCode shipping");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (["Cancelled", "Rejected"].includes(order.status)) {
      return res.status(400).json({ message: "This order is cancelled, a shipment cannot be booked" });
    }
    if (order.shipment?.awbCode) {
      return res.status(400).json({ message: `A shipment already exists for this order (AWB ${order.shipment.awbCode})` });
    }

    const suggested = suggestPackage(order);
    const pkg = {
      weight: Number(weight) || suggested.weight,
      length: Number(length) || suggested.length,
      breadth: Number(breadth) || suggested.breadth,
      height: Number(height) || suggested.height,
    };

    const problems = validateShipmentReadiness(order, pkg);
    if (problems.length) {
      return res.status(400).json({ message: `Cannot book the shipment without ${problems.join(", ")}` });
    }

    // 1. Create the order on Shiprocket (skipped when a previous attempt already created it)
    let shiprocketOrderId = order.shipment?.shiprocketOrderId || "";
    let shipmentId = order.shipment?.shipmentId || "";
    if (!shipmentId) {
      const payload = buildOrderPayload({ order, pickupLocation: SHIPROCKET_PICKUP_LOCATION, pkg });
      const created = await createShiprocketOrder(payload);
      shiprocketOrderId = String(created?.order_id || "");
      shipmentId = String(created?.shipment_id || "");
      if (!shipmentId) {
        return res.status(502).json({ message: "Shiprocket did not return a shipment id" });
      }
      order.shipment = {
        ...(order.shipment?.toObject ? order.shipment.toObject() : order.shipment || {}),
        provider: "shiprocket",
        shiprocketOrderId,
        shipmentId,
        pickupLocation: SHIPROCKET_PICKUP_LOCATION,
        appliedWeight: pkg.weight,
        createdAt: new Date(),
      };
      await order.save();
    }

    // 2. Assign an AWB with the chosen courier
    const awbRes = await assignAwb({ shipmentId, courierId });
    const awbData = awbRes?.response?.data || {};
    const awbCode = String(awbData.awb_code || "");
    if (!awbCode) {
      return res.status(502).json({ message: awbRes?.message || "Courier did not return an AWB number" });
    }

    order.shipment.awbCode = awbCode;
    order.shipment.courierName = awbData.courier_name || "";
    order.shipment.courierId = String(awbData.courier_company_id || courierId || "");
    order.shipment.freightCharge = Number(awbData.freight_charges) || 0;
    order.shipment.appliedWeight = Number(awbData.applied_weight) || pkg.weight;
    order.shipment.trackingUrl = `https://shiprocket.co/tracking/${awbCode}`;
    order.shipment.status = "AWB assigned";

    // 3. Ask the courier to pick the parcel up
    if (schedulePickup) {
      try {
        const pickup = await requestPickup({ shipmentId });
        order.shipment.pickupScheduledAt = new Date();
        order.shipment.pickupTokenNumber = String(pickup?.response?.pickup_token_number || "");
      } catch (pickupErr) {
        // The shipment is booked; pickup can be retried from the panel
        console.error("Shiprocket pickup error:", pickupErr?.message);
      }
    }

    // 4. Shipping label, best effort
    try {
      const label = await generateLabel({ shipmentId });
      if (label?.label_url) order.shipment.labelUrl = label.label_url;
    } catch (labelErr) {
      console.error("Shiprocket label error:", labelErr?.message);
    }

    // Booking a courier means the order is on its way out
    order.dispatchRequest = "approved";
    if (!["Order Dispatched", "Order Delivered", "Delivered"].includes(order.status)) {
      order.status = "Order Dispatched";
    }
    await order.save();

    logActivity(req, "shipment_created",
      `Shipment booked for order #${order.orderNumber || order._id} with ${order.shipment.courierName} (AWB ${awbCode})`,
      { entity: "order", entityId: String(order._id), meta: { awbCode, courier: order.shipment.courierName } }
    );

    return res.status(200).json({ message: "Shipment booked", shipment: order.shipment, status: order.status });
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return res.status(err.status === 401 ? 502 : err.status).json({ message: err.message });
    }
    console.error("Create shipment error:", err);
    return res.status(500).json({ message: "Could not book the shipment" });
  }
}
