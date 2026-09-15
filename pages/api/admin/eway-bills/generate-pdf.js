// pages/api/admin/eway-bills/generate-pdf.js
// POST { invoiceId, download? } — renders a fresh e-way bill PDF (layout in lib/ewayBillPdf.js).
// download: true -> responds with the PDF file itself, so the browser never gets a stale cached copy.
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import EwayBill from "@/models/EwayBill";
import { renderEwayBillPdf } from "@/lib/ewayBillPdf";
import fs from "fs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const { invoiceId, download } = req.body || {};
    const bill = await EwayBill.findOne({ invoiceId });
    if (!bill) return res.status(404).json({ message: "Please save the e-way bill first" });
    const inv = await Invoice.findById(invoiceId).lean();
    if (!inv) return res.status(404).json({ message: "Invoice not found" });

    const { pdfUrl, filePath, filename } = await renderEwayBillPdf(bill, inv);
    await bill.save();

    if (download) {
      const file = fs.readFileSync(filePath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", file.length);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(file);
    }

    return res.status(200).json({ pdfUrl });
  } catch (err) {
    console.error("EWAY PDF ERROR:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
