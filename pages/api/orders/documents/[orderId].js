// Documents a buyer may download for one of their own orders — the tax invoice
// and, where one was raised, the e-way bill. Partners and retail customers both
// use this; the only check is that the order belongs to whoever is asking.
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import Invoice from "@/models/Invoice";
import EwayBill from "@/models/EwayBill";

export default async function handler(req, res) {
  await dbConnect();

  // One buyer's documents must never sit in a shared cache
  res.setHeader("Cache-Control", "private, no-store");

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { orderId } = req.query;

  try {
    const order = await Order.findOne({ _id: orderId, user: user._id })
      .select("_id orderNumber")
      .lean();
    if (!order) return res.status(404).json({ message: "Order not found" });

    // One invoice can cover several orders, so either reference counts
    const invoices = await Invoice.find({
      status: { $ne: "CANCELLED" },
      $or: [{ orderId: order._id }, { orderNumbers: order.orderNumber }],
    })
      .select("invoiceNumber invoiceDate grandTotal createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const ewayBills = invoices.length
      ? await EwayBill.find({
          invoiceId: { $in: invoices.map((i) => i._id) },
          status: { $ne: "CANCELLED" },
        })
          .select("invoiceId invoiceNumber ewbNumber validUpto status")
          .lean()
      : [];

    return res.status(200).json({
      invoices: invoices.map((i) => ({
        id: String(i._id),
        invoiceNumber: i.invoiceNumber,
        invoiceDate: i.invoiceDate || i.createdAt,
        grandTotal: Number(i.grandTotal || 0),
      })),
      ewayBills: ewayBills.map((b) => ({
        id: String(b._id),
        invoiceNumber: b.invoiceNumber,
        ewbNumber: b.ewbNumber || "",
        validUpto: b.validUpto || null,
        status: b.status,
      })),
    });
  } catch (err) {
    console.error("Order documents error:", err);
    return res.status(500).json({ message: "Could not load your documents" });
  }
}
