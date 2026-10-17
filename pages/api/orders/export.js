// Exports the signed-in buyer's own orders as a CSV file. Same filters as the
// orders list, so what is exported is what the buyer is looking at. Partners
// and retail customers both use it; each only ever sees their own orders.
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import Invoice from "@/models/Invoice";

const MAX_ROWS = 5000;

// A field holding a comma, a quote or a newline has to be quoted, and a leading
// =, +, - or @ is prefixed so a spreadsheet treats it as text, not a formula
const csvCell = (value) => {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const csvRow = (cells) => cells.map(csvCell).join(",");

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

export default async function handler(req, res) {
  await dbConnect();

  res.setHeader("Cache-Control", "private, no-store");

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { status, dateFrom, dateTo, search } = req.query;

  try {
    const filter = { user: user._id };

    if (status && status !== "All") filter.status = status;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    if (search && String(search).trim()) {
      filter.orderNumber = { $regex: String(search).trim(), $options: "i" };
    }

    const orders = await Order.find(filter)
      .populate({ path: "items.product", select: "name" })
      .sort({ createdAt: -1 })
      .limit(MAX_ROWS)
      .lean();

    // Invoice numbers are looked up in one query instead of one per order
    const invoiceMap = {};
    if (orders.length) {
      const invoices = await Invoice.find({
        status: { $ne: "CANCELLED" },
        orderId: { $in: orders.map((o) => o._id) },
      })
        .select("orderId invoiceNumber")
        .lean();

      invoices.forEach((inv) => {
        const key = String(inv.orderId);
        invoiceMap[key] = invoiceMap[key]
          ? `${invoiceMap[key]} | ${inv.invoiceNumber}`
          : inv.invoiceNumber;
      });
    }

    const header = [
      "Order Number",
      "Order Date",
      "Status",
      "Payment Method",
      "Payment Status",
      "Items",
      "Total Quantity",
      "Subtotal",
      "GST",
      "Transport Charge",
      "Total",
      "Invoice Number",
    ];

    const rows = orders.map((o) => {
      const items = o.items || [];
      const names = items
        .map((i) => i.product?.name || i.productName || "Product")
        .join(" | ");
      const qty = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

      return csvRow([
        o.orderNumber || "",
        formatDate(o.createdAt),
        o.status || "",
        o.paymentMethod || "",
        o.paymentStatus || "",
        names,
        qty,
        Number(o.subtotal || 0).toFixed(2),
        Number(o.gstAmount || 0).toFixed(2),
        Number(o.shippingCharge || 0).toFixed(2),
        Number(o.total || 0).toFixed(2),
        invoiceMap[String(o._id)] || "",
      ]);
    });

    // The BOM makes Excel open rupee amounts and names as UTF-8
    const csv = `﻿${csvRow(header)}\n${rows.join("\n")}\n`;
    const stamp = new Date().toISOString().split("T")[0];

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="my-orders-${stamp}.csv"`
    );
    return res.status(200).send(csv);
  } catch (err) {
    console.error("Order export error:", err);
    return res.status(500).json({ message: "Could not export your orders" });
  }
}
