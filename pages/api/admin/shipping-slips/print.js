// pages/api/admin/shipping-slips/print.js
// GET  ?ids=<orderId>,<orderId>  → everything needed to draw the slips,
//                                  with barcodes as SVG
// POST { ids: [orderId, ...] }    → records that these slips were printed
import mongoose from "mongoose";
import bwipjs from "bwip-js";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import Admin from "@/models/Admin";
import ShippingSlip from "@/models/ShippingSlip";
import "@/models/User";
import { requireAdminPermission } from "@/lib/adminAuth";
import { SELLER } from "@/lib/ewayBill";
import { MAX_PRINT_BATCH, codToCollect, orderSide, describeAttrs } from "@/lib/shippingSlips";

function parseIds(raw) {
  const list = Array.isArray(raw) ? raw : String(raw || "").split(",");
  const ids = [...new Set(list.map((s) => String(s).trim()).filter((s) => mongoose.Types.ObjectId.isValid(s)))];
  return ids.slice(0, MAX_PRINT_BATCH);
}

function barcode(text) {
  if (!text) return "";
  try {
    return bwipjs.toSVG({ bcid: "code128", text: String(text), height: 10, includetext: true, textxalign: "center", textsize: 9 });
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "shipping_slips");
  if (!admin) return;

  if (req.method === "GET") return slipData(req, res);
  if (req.method === "POST") return markPrinted(req, res, admin);

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method not allowed" });
}

async function slipData(req, res) {
  const ids = parseIds(req.query.ids);
  if (!ids.length) return res.status(400).json({ message: "Select at least one order" });

  try {
    const [orders, slips] = await Promise.all([
      Order.find({ _id: { $in: ids } })
        .select("orderNumber orderName status user shipping items paymentMethod paymentStatus total shipment.awbCode shipment.courierName preferredCourier.name createdAt")
        .populate("user", "name companyName phone userType")
        .lean(),
      ShippingSlip.find({ order: { $in: ids } }).lean(),
    ]);
    const slipByOrder = new Map(slips.map((s) => [String(s.order), s]));
    const byId = new Map(orders.map((o) => [String(o._id), o]));

    // Keep the order the admin picked them in
    const data = ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((o) => {
        const slip = slipByOrder.get(String(o._id)) || {};
        const awb = o.shipment?.awbCode || "";
        return {
          _id: o._id,
          orderNumber: o.orderNumber || "",
          orderName: o.orderName || "",
          status: o.status,
          cancelled: o.status === "Cancelled",
          side: orderSide(o),
          orderDate: o.createdAt,
          shipTo: {
            name: o.shipping?.name || o.user?.name || "",
            company: o.user?.userType === "partner" ? o.user?.companyName || "" : "",
            phone: o.shipping?.phone || o.user?.phone || "",
            street: o.shipping?.street || "",
            city: o.shipping?.city || "",
            state: o.shipping?.state || "",
            zip: o.shipping?.zip || "",
          },
          items: (o.items || []).map((it) => ({
            name: it.productName || "Item",
            quantity: Number(it.quantity || 0),
            freeQty: Number(it.freeQty || 0),
            options: describeAttrs(it.selectedAttrs),
          })),
          cod: codToCollect(o),
          paymentMethod: o.paymentMethod,
          awbCode: awb,
          courier: o.shipment?.courierName || o.preferredCourier?.name || "",
          boxes: slip.boxes || 1,
          weightKg: slip.weightKg || 0,
          dimensions: slip.dimensions || "",
          note: slip.note || "",
          printCount: slip.printCount || 0,
          orderBarcode: barcode(o.orderNumber),
          awbBarcode: barcode(awb),
        };
      });

    if (!data.length) return res.status(404).json({ message: "No orders found" });

    return res.json({
      seller: {
        name: SELLER.name,
        street: SELLER.street,
        city: SELLER.city,
        state: SELLER.state,
        pincode: SELLER.pincode,
        gstin: SELLER.gstin,
      },
      slips: data,
    });
  } catch (err) {
    console.error("Shipping slip data error:", err);
    return res.status(500).json({ message: "Could not prepare the slips" });
  }
}

async function markPrinted(req, res, admin) {
  const ids = parseIds(req.body?.ids);
  if (!ids.length) return res.status(400).json({ message: "Select at least one order" });

  try {
    const [who, orders] = await Promise.all([
      Admin.findById(admin.id).select("name email").lean(),
      Order.find({ _id: { $in: ids } }).select("_id orderNumber").lean(),
    ]);
    const by = who?.name || who?.email || "Admin";
    const now = new Date();

    await ShippingSlip.bulkWrite(
      orders.map((o) => ({
        updateOne: {
          filter: { order: o._id },
          update: {
            $set: { lastPrintedAt: now, lastPrintedBy: by, orderNumber: o.orderNumber || "" },
            $setOnInsert: { firstPrintedAt: now, boxes: 1 },
            $inc: { printCount: 1 },
            $push: { printLog: { $each: [{ at: now, by }], $slice: -20 } },
          },
          upsert: true,
        },
      }))
    );
    // A record first made by saving packing details has no first print
    // date yet; fill it now
    await ShippingSlip.updateMany(
      { order: { $in: orders.map((o) => o._id) }, firstPrintedAt: { $exists: false } },
      { $set: { firstPrintedAt: now } }
    );

    return res.json({ success: true, count: orders.length });
  } catch (err) {
    console.error("Shipping slip print log error:", err);
    return res.status(500).json({ message: "Could not record the print" });
  }
}
