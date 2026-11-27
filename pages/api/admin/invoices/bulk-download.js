// pages/api/admin/invoices/bulk-download.js
// POST — builds one ZIP with a PDF of every chosen invoice.
// Body: { ids: [...] } for picked invoices, or { filters: { status, partnerType,
// search, fromDate, toDate } } for every invoice matching the list filters.
// PDFs are rendered fresh, so the ZIP always matches the current invoice data.
// Nothing is saved to disk or to the invoice records.
import mongoose from "mongoose";
import puppeteer from "puppeteer";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import { requireAdminPermission } from "@/lib/adminAuth";
import { renderInvoicePdf } from "@/pages/api/admin/invoices/generate-pdf";
import { buildZip } from "@/lib/zipWriter";

const MAX_BULK_INVOICES = 300;

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function filterFrom({ status, partnerType, search, fromDate, toDate } = {}) {
  const filter = {};
  if (status) filter.status = String(status);
  if (partnerType) filter.partnerType = String(partnerType);

  // Same date rule as the list: createdAt, "to" includes the whole day
  const range = {};
  if (fromDate) {
    const d = new Date(fromDate);
    if (!isNaN(d)) { d.setHours(0, 0, 0, 0); range.$gte = d; }
  }
  if (toDate) {
    const d = new Date(toDate);
    if (!isNaN(d)) { d.setHours(23, 59, 59, 999); range.$lte = d; }
  }
  if (Object.keys(range).length) filter.createdAt = range;

  const q = String(search || "").trim();
  if (q) {
    const re = new RegExp(escapeRe(q), "i");
    filter.$or = [{ invoiceNumber: re }, { orderNumber: re }, { partnerName: re }, { "partnerAddress.gst": re }];
  }
  return filter;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();
  const admin = await requireAdminPermission(req, res, "invoices");
  if (!admin) return;

  const { ids, filters } = req.body || {};
  let filter;
  if (Array.isArray(ids) && ids.length) {
    const valid = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!valid.length) return res.status(400).json({ message: "No valid invoices were chosen." });
    filter = { _id: { $in: valid } };
  } else {
    filter = filterFrom(filters);
  }

  const list = await Invoice.find(filter).select("_id invoiceNumber").sort({ createdAt: -1 }).lean();
  if (!list.length) return res.status(404).json({ message: "No invoices match these filters." });
  if (list.length > MAX_BULK_INVOICES) {
    return res.status(400).json({
      message: `${list.length} invoices match. Download up to ${MAX_BULK_INVOICES} at a time — narrow the dates or filters.`,
    });
  }

  let browser;
  const entries = [];
  const failed = [];
  const used = new Set();
  try {
    browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    for (const inv of list) {
      try {
        const { buffer, filename } = await renderInvoicePdf(inv._id, { browser, toBuffer: true });
        // Two invoices can share a number after edits; keep both files
        let name = filename;
        for (let n = 2; used.has(name.toLowerCase()); n++) name = filename.replace(/\.pdf$/i, `-${n}.pdf`);
        used.add(name.toLowerCase());
        entries.push({ name, data: buffer });
      } catch (err) {
        console.error("Bulk invoice PDF error:", inv.invoiceNumber, err?.message);
        failed.push(inv.invoiceNumber || String(inv._id));
      }
    }
  } catch (err) {
    console.error("Bulk invoice download error:", err);
    return res.status(500).json({ message: "Could not start the PDF generator." });
  } finally {
    // Closing Chrome can take a while on Windows; do not make the download wait for it
    if (browser) browser.close().catch(() => {});
  }

  if (!entries.length) return res.status(500).json({ message: "None of the invoice PDFs could be created." });

  if (failed.length) {
    const note = `These invoices could not be turned into PDFs:\r\n${failed.join("\r\n")}\r\n`;
    entries.push({ name: "NOT-INCLUDED.txt", data: Buffer.from(note, "utf8") });
  }

  const zip = buildZip(entries);
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="invoices-${stamp}.zip"`);
  res.setHeader("Content-Length", zip.length);
  res.setHeader("X-Invoice-Count", String(entries.length - (failed.length ? 1 : 0)));
  res.setHeader("X-Invoice-Failed", String(failed.length));
  res.setHeader("Access-Control-Expose-Headers", "X-Invoice-Count, X-Invoice-Failed");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(zip);
}

export const config = { api: { responseLimit: false } };
