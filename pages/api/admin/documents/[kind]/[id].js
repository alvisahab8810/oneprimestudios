// Serves an invoice or e-way bill PDF to an admin. This is what invoice.pdfUrl
// and bill.pdfUrl now point at: the file itself sits outside /public, so it can
// only be read through this route, and it is rendered on the spot when the copy
// on disk is missing (a fresh deploy, or a document that was never generated).
import fs from "fs";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import EwayBill from "@/models/EwayBill";
import { requireAdminPermission } from "@/lib/adminAuth";
import { findStoredPdf, pdfFilename } from "@/lib/documentStorage";
import { renderInvoicePdf } from "@/pages/api/admin/invoices/generate-pdf";
import { renderEwayBillPdf } from "@/lib/ewayBillPdf";

// Rendering with Puppeteer takes longer than a normal API call
export const config = { api: { responseLimit: false } };

// Documents generated before this change were named from the invoice number as
// it was typed, slashes and all, so both spellings are looked for
const candidates = (invoiceNumber, prefix = "") => {
  const raw = String(invoiceNumber || "").trim();
  const list = [pdfFilename(raw, prefix)];
  if (raw) list.push(`${prefix}${raw}.pdf`);
  return list;
};

const firstExisting = (kind, names) => {
  for (const name of names) {
    const found = findStoredPdf(kind, name);
    if (found) return found;
  }
  return null;
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const admin = await requireAdminPermission(req, res, "invoices");
  if (!admin) return;

  res.setHeader("Cache-Control", "private, no-store");

  const kind = String(req.query.kind || "").toLowerCase();
  const id = String(req.query.id || "").trim();

  try {
    let filePath = "";
    let filename = "";

    if (kind === "invoice") {
      const invoice = await Invoice.findById(id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      filename = pdfFilename(invoice.invoiceNumber);
      filePath = firstExisting("invoice", candidates(invoice.invoiceNumber)) || "";

      if (!filePath) {
        const built = await renderInvoicePdf(invoice._id);
        filePath = built.filePath;
        filename = built.filename;
      }
    } else if (kind === "eway") {
      const bill = await EwayBill.findById(id);
      if (!bill) return res.status(404).json({ message: "E-way bill not found" });

      const invoice = await Invoice.findById(bill.invoiceId).lean();
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      filename = pdfFilename(invoice.invoiceNumber, "EWB-");
      filePath =
        firstExisting("eway", candidates(invoice.invoiceNumber, "EWB-")) || "";

      if (!filePath) {
        const built = await renderEwayBillPdf(bill, invoice);
        await bill.save();
        filePath = built.filePath;
        filename = built.filename;
      }
    } else {
      return res.status(400).json({ message: "Unknown document type" });
    }

    const file = fs.readFileSync(filePath);
    res.setHeader("Content-Type", "application/pdf");
    // inline so the admin's "Download PDF" link opens it in a tab as before
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", file.length);
    return res.status(200).send(file);
  } catch (err) {
    console.error("ADMIN DOCUMENT ERROR:", err);
    return res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Could not open the document" });
  }
}
