// Streams a buyer's own invoice or e-way bill as a PDF attachment.
// The file is rendered fresh on every request, so a document the admin edited
// never comes back stale, and it is sent through this route rather than linked
// from /public so that only the buyer it belongs to can fetch it.
import fs from "fs";
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import Invoice from "@/models/Invoice";
import EwayBill from "@/models/EwayBill";
import { renderInvoicePdf } from "@/pages/api/admin/invoices/generate-pdf";
import { renderEwayBillPdf } from "@/lib/ewayBillPdf";

// Rendering a PDF with Puppeteer takes longer than a normal API call
export const config = { api: { responseLimit: false } };

// The invoice is the buyer's when it was raised in their name, or when it
// belongs to an order of theirs
async function ownsInvoice(invoice, userId) {
  if (String(invoice.partnerId) === String(userId)) return true;

  const order = await Order.findOne({ _id: invoice.orderId, user: userId })
    .select("_id")
    .lean();
  return !!order;
}

export default async function handler(req, res) {
  await dbConnect();

  res.setHeader("Cache-Control", "private, no-store");

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const type = String(req.query.type || "invoice").toLowerCase();
  const id = String(req.query.id || "").trim();
  if (!id) return res.status(400).json({ message: "Document id required" });

  try {
    let filePath = "";
    let filename = "";

    if (type === "invoice") {
      const invoice = await Invoice.findById(id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.status === "CANCELLED") {
        return res.status(410).json({ message: "This invoice has been cancelled" });
      }
      if (!(await ownsInvoice(invoice, user._id))) {
        return res.status(403).json({ message: "This invoice is not yours to download" });
      }

      const built = await renderInvoicePdf(invoice._id);
      filePath = built.filePath;
      filename = built.filename;
    } else if (type === "eway") {
      const bill = await EwayBill.findById(id);
      if (!bill) return res.status(404).json({ message: "E-way bill not found" });
      if (bill.status === "CANCELLED") {
        return res.status(410).json({ message: "This e-way bill has been cancelled" });
      }

      const invoice = await Invoice.findById(bill.invoiceId).lean();
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (!(await ownsInvoice(invoice, user._id))) {
        return res.status(403).json({ message: "This e-way bill is not yours to download" });
      }

      const built = await renderEwayBillPdf(bill, invoice);
      await bill.save();
      filePath = built.filePath;
      filename = built.filename;
    } else {
      return res.status(400).json({ message: "Unknown document type" });
    }

    const file = fs.readFileSync(filePath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", file.length);
    return res.status(200).send(file);
  } catch (err) {
    console.error("Document download error:", err);
    return res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Could not prepare the document" });
  }
}
