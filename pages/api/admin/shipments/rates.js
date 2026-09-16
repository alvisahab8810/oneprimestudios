// pages/api/admin/shipments/rates.js
// Courier options and prices for one order, plus the package size suggested from its products.
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";
import { requireAdminPermission } from "@/lib/adminAuth";
import { checkServiceability, isShiprocketConfigured, SHIPROCKET_PICKUP_LOCATION, ShiprocketError } from "@/lib/shiprocket";
import { suggestPackage, validateShipmentReadiness } from "@/lib/shipmentPayload";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const admin = await requireAdminPermission(req, res, "orders");
    if (!admin) return;

    if (!isShiprocketConfigured()) {
      return res.status(503).json({ message: "Shiprocket is not set up yet. Add the API user details on the server." });
    }

    const { orderId, weight, length, breadth, height } = req.query;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order id" });
    }

    const order = await Order.findById(orderId)
      .populate("user", "name email phone")
      .populate("items.product", "name sku hsnCode shipping")
      .lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    const suggested = suggestPackage(order);
    // The admin may try a different size before booking
    const pkg = {
      weight: Number(weight) || suggested.weight,
      length: Number(length) || suggested.length,
      breadth: Number(breadth) || suggested.breadth,
      height: Number(height) || suggested.height,
    };

    const problems = validateShipmentReadiness(order, pkg);
    const pickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE || "";
    if (!pickupPincode) {
      return res.status(503).json({ message: "Pickup pincode is not set on the server" });
    }
    if (problems.length) {
      return res.status(200).json({ suggested, pkg, problems, couriers: [], pickupLocation: SHIPROCKET_PICKUP_LOCATION });
    }

    const data = await checkServiceability({
      pickupPincode,
      deliveryPincode: order.shipping.zip,
      weight: pkg.weight,
      declaredValue: Math.round(Number(order.total) || 0),
    });

    const couriers = (data?.data?.available_courier_companies || []).map((c) => ({
      courierId: String(c.courier_company_id),
      name: c.courier_name,
      rate: Number(c.rate) || 0,
      estimatedDays: c.estimated_delivery_days || c.etd_hours ? c.estimated_delivery_days : "",
      etd: c.etd || "",
      rating: Number(c.rating) || 0,
      codAvailable: !!c.cod,
      recommended: String(data?.data?.recommended_courier_company_id || "") === String(c.courier_company_id),
    })).sort((a, b) => a.rate - b.rate);

    return res.status(200).json({
      suggested,
      pkg,
      problems: [],
      couriers,
      pickupLocation: SHIPROCKET_PICKUP_LOCATION,
    });
  } catch (err) {
    if (err instanceof ShiprocketError) {
      return res.status(err.status === 401 ? 502 : err.status).json({ message: err.message });
    }
    console.error("Shipment rates error:", err);
    return res.status(500).json({ message: "Could not load courier rates" });
  }
}
