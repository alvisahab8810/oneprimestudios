// pages/api/admin/shipping-slips/index.js
// GET ?stage=ready|dispatched|all&side=b2b|b2c&printed=yes|no&search=&page=&limit=
//   → B2B and B2C orders that are packed or dispatched, each with its slip
//     record (if any), plus counts for the packing desk.
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import User from "@/models/User";
import ShippingSlip from "@/models/ShippingSlip";
import { requireAdminPermission } from "@/lib/adminAuth";
import { SLIP_STAGES, SLIP_STATUSES, codToCollect, orderSide } from "@/lib/shippingSlips";

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }
  await dbConnect();
  const admin = await requireAdminPermission(req, res, "shipping_slips");
  if (!admin) return;

  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { stage = "ready", side = "", printed = "", search = "" } = req.query;

    const statuses = SLIP_STAGES[stage] || SLIP_STATUSES;
    const and = [{ status: { $in: statuses } }];

    if (side === "b2b" || side === "b2c") {
      const partnerIds = await User.find({ userType: "partner" }).distinct("_id");
      and.push({ user: side === "b2b" ? { $in: partnerIds } : { $nin: partnerIds } });
    }

    if (printed === "yes" || printed === "no") {
      const printedIds = await ShippingSlip.find({ printCount: { $gt: 0 } }).distinct("order");
      and.push({ _id: printed === "yes" ? { $in: printedIds } : { $nin: printedIds } });
    }

    const term = String(search).trim().slice(0, 60);
    if (term) {
      const rx = new RegExp(escapeRegex(term), "i");
      const users = await User.find({ $or: [{ name: rx }, { companyName: rx }, { phone: rx }] })
        .select("_id")
        .limit(200)
        .lean();
      and.push({
        $or: [
          { orderNumber: rx },
          { orderName: rx },
          { "shipping.name": rx },
          { "shipping.phone": rx },
          { "shipping.zip": rx },
          { "shipment.awbCode": rx },
          { user: { $in: users.map((u) => u._id) } },
        ],
      });
    }

    const filter = { $and: and };
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [orders, total, readyTotal, dispatchedTotal, printedReadyIds, printedToday] = await Promise.all([
      Order.find(filter)
        .select("orderNumber orderName status user shipping items.productName items.quantity items.freeQty paymentMethod paymentStatus total shipment.awbCode shipment.courierName preferredCourier.name createdAt updatedAt")
        .populate("user", "name companyName phone userType")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
      Order.countDocuments({ status: { $in: SLIP_STAGES.ready } }),
      Order.countDocuments({ status: { $in: SLIP_STAGES.dispatched } }),
      ShippingSlip.find({ printCount: { $gt: 0 } }).distinct("order"),
      ShippingSlip.countDocuments({ lastPrintedAt: { $gte: startOfToday } }),
    ]);

    const readyPrinted = printedReadyIds.length
      ? await Order.countDocuments({ _id: { $in: printedReadyIds }, status: { $in: SLIP_STAGES.ready } })
      : 0;

    const slips = await ShippingSlip.find({ order: { $in: orders.map((o) => o._id) } }).lean();
    const slipByOrder = new Map(slips.map((s) => [String(s.order), s]));

    const data = orders.map((o) => {
      const slip = slipByOrder.get(String(o._id)) || null;
      return {
        _id: o._id,
        orderNumber: o.orderNumber,
        orderName: o.orderName || "",
        status: o.status,
        side: orderSide(o),
        customer: o.user?.companyName || o.user?.name || o.shipping?.name || "",
        shipping: o.shipping || {},
        itemCount: (o.items || []).reduce((n, it) => n + Number(it.quantity || 0), 0),
        items: (o.items || []).map((it) => ({ name: it.productName || "Item", quantity: it.quantity })),
        cod: codToCollect(o),
        paymentMethod: o.paymentMethod,
        awbCode: o.shipment?.awbCode || "",
        courier: o.shipment?.courierName || o.preferredCourier?.name || "",
        createdAt: o.createdAt,
        slip: slip
          ? {
              boxes: slip.boxes || 1,
              weightKg: slip.weightKg || 0,
              dimensions: slip.dimensions || "",
              note: slip.note || "",
              printCount: slip.printCount || 0,
              lastPrintedAt: slip.lastPrintedAt || null,
              lastPrintedBy: slip.lastPrintedBy || "",
            }
          : null,
      };
    });

    return res.json({
      data,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        ready: readyTotal,
        readyNotPrinted: Math.max(0, readyTotal - readyPrinted),
        dispatched: dispatchedTotal,
        printedToday,
      },
    });
  } catch (err) {
    console.error("Shipping slips list error:", err);
    return res.status(500).json({ message: "Could not load orders for slips" });
  }
}
