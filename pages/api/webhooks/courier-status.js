// pages/api/webhooks/courier-status.js
// The courier partner calls this whenever a parcel is scanned, so order status follows it on its own.
// Set the same token in the courier panel (Settings > Webhooks) and in SHIPROCKET_WEBHOOK_TOKEN.
// The route name avoids the provider's name because their panel rejects such URLs.
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { mapCourierStatusToOrderStatus } from "@/lib/shipmentPayload";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN || "";
  const received = req.headers["x-api-key"] || req.headers["x-shiprocket-token"] || "";
  if (!expected || received !== expected) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await dbConnect();

    const body = req.body || {};
    const awb = String(body.awb || body.awb_code || "").trim();
    const courierStatus = String(body.current_status || body.shipment_status || "").trim();
    if (!awb) return res.status(400).json({ message: "Missing AWB" });

    const order = await Order.findOne({ "shipment.awbCode": awb });
    // Always answer 200 for an unknown parcel, otherwise Shiprocket keeps retrying
    if (!order) return res.status(200).json({ message: "No matching order" });

    order.shipment.status = courierStatus || order.shipment.status;
    if (body.current_status_id) order.shipment.statusCode = Number(body.current_status_id);
    if (body.etd) order.shipment.expectedDeliveryDate = new Date(body.etd);
    if (body.courier_name) order.shipment.courierName = body.courier_name;
    order.shipment.lastTrackedAt = new Date();

    const scans = Array.isArray(body.scans) ? body.scans : [];
    if (scans.length) {
      order.shipment.trackingHistory = scans.map((s) => ({
        status: s.status || s["sr-status-label"] || "",
        activity: s.activity || "",
        location: s.location || "",
        date: s.date ? new Date(s.date) : undefined,
      }));
    } else if (courierStatus) {
      order.shipment.trackingHistory.push({
        status: courierStatus,
        activity: body.activity || "",
        location: body.location || "",
        date: new Date(),
      });
    }

    const mapped = mapCourierStatusToOrderStatus(courierStatus);
    if (mapped && order.status !== mapped && !["Cancelled", "Rejected"].includes(order.status)) {
      order.status = mapped;
      if (mapped === "Order Delivered" && !order.deliveredAt) order.deliveredAt = new Date();
    }

    await order.save();
    return res.status(200).json({ message: "Updated" });
  } catch (err) {
    console.error("Shiprocket webhook error:", err);
    return res.status(200).json({ message: "Received" });
  }
}
