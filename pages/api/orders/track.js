// Powers the buyer's Order Status screens: the stage tabs with their counts,
// and the three ways of searching — by order number, by stage, by date.
// Everything is scoped to whoever is asking, so one buyer can never see
// another's orders.
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { ORDER_STAGES, getStage, stageLabel } from "@/lib/orderStages";

const MAX_ROWS = 200;

export default async function handler(req, res) {
  await dbConnect();

  // One buyer's orders must never sit in a shared cache
  res.setHeader("Cache-Control", "private, no-store");

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { stage, orderNumber, from, to } = req.query;

  try {
    const mine = { user: user._id };

    // Counts for every tab, in one pass over this buyer's orders
    const grouped = await Order.aggregate([
      { $match: mine },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const perStatus = {};
    grouped.forEach((row) => {
      perStatus[row._id] = row.count;
    });

    const counts = ORDER_STAGES.map((s) => ({
      id: s.id,
      label: s.label,
      count: s.statuses.reduce((sum, st) => sum + (perStatus[st] || 0), 0),
    }));

    // The buyer's own details head every row of the table
    const member = {
      memberId: user.memberId || "",
      name: user.name || "",
      press: user.companyName || user.name || "",
    };

    // Nothing asked for yet — the screen only needs the tabs
    if (!stage && !orderNumber && !from && !to) {
      return res.json({ counts, member, orders: [] });
    }

    const filter = { ...mine };

    if (stage) {
      const found = getStage(stage);
      if (!found) return res.status(400).json({ message: "Unknown stage" });
      filter.status = { $in: found.statuses };
    }

    if (orderNumber) {
      // A buyer may type the number with or without the leading #
      const cleaned = String(orderNumber).trim().replace(/^#/, "");
      if (!cleaned) return res.status(400).json({ message: "Enter an order number" });
      filter.orderNumber = new RegExp(cleaned.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const start = new Date(from);
        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid start date" });
        }
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (to) {
        const end = new Date(to);
        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({ message: "Invalid end date" });
        }
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const found = await Order.find(filter)
      .select("orderNumber status createdAt total orderName items")
      .populate("items.product", "name")
      .sort({ createdAt: -1 })
      .limit(MAX_ROWS)
      .lean();

    const orders = found.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber || "",
      status: order.status,
      stage: stageLabel(order.status),
      createdAt: order.createdAt,
      total: order.total,
      orderName: order.orderName || "",
      // A one-line summary of what was ordered, like the job sheet shows
      detail: (order.items || [])
        .map((item) => {
          const name = item.product?.name || item.productName || "Item";
          return `${name} x ${item.quantity || 1}`;
        })
        .join(", "),
    }));

    return res.json({ counts, member, orders, truncated: orders.length === MAX_ROWS });
  } catch (err) {
    console.error("Order track error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
