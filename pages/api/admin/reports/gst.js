// pages/api/admin/reports/gst.js
// GST Filing Report — Per Party / Monthly Details
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import Admin from "@/models/Admin";
import { verifyJWT } from "@/lib/verifyJWT";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  await dbConnect();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = req.cookies.admin_auth;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  const decoded = verifyJWT(token);
  if (!decoded) return res.status(401).json({ message: "Unauthorized" });
  const adminUser = await Admin.findById(decoded.id, { role: 1 });
  if (!adminUser) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { month, year } = req.query; // month: 1–12, year: e.g. 2025

    // ── Build date filter ─────────────────────────────────────────────────
    const filter = { status: { $ne: "CANCELLED" } };

    if (year && month) {
      const y = Number(year);
      const m = Number(month);
      filter.createdAt = {
        $gte: new Date(y, m - 1, 1),
        $lt:  new Date(y, m,     1),
      };
    } else if (year) {
      const y = Number(year);
      filter.createdAt = {
        $gte: new Date(y,     0, 1),
        $lt:  new Date(y + 1, 0, 1),
      };
    }

    const invoices = await Invoice.find(filter).sort({ createdAt: 1 }).lean();

    // ── Per-party grouping ────────────────────────────────────────────────
    const partyMap = {};
    invoices.forEach((inv) => {
      const key = String(inv.partnerId || inv.partnerName);
      if (!partyMap[key]) {
        partyMap[key] = {
          partnerId:   inv.partnerId,
          partnerName: inv.partnerName,
          gstin:       inv.partnerAddress?.gst || "",
          partnerType: inv.partnerType || "B2B",
          invoices:    [],
          totals: { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0, grand: 0 },
        };
      }
      partyMap[key].invoices.push({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate:   inv.invoiceDate || inv.createdAt,
        gstType:       inv.gstType,
        taxable:       inv.taxableValue || inv.subTotal || 0,
        cgst:          inv.cgstAmount  || 0,
        sgst:          inv.sgstAmount  || 0,
        igst:          inv.igstAmount  || 0,
        tax:           inv.gstAmount   || 0,
        grand:         inv.grandTotal  || 0,
      });
      partyMap[key].totals.taxable += inv.taxableValue || inv.subTotal || 0;
      partyMap[key].totals.cgst   += inv.cgstAmount  || 0;
      partyMap[key].totals.sgst   += inv.sgstAmount  || 0;
      partyMap[key].totals.igst   += inv.igstAmount  || 0;
      partyMap[key].totals.tax    += inv.gstAmount   || 0;
      partyMap[key].totals.grand  += inv.grandTotal  || 0;
    });

    // ── Overall summary ───────────────────────────────────────────────────
    const summary = {
      totalInvoices: invoices.length,
      taxable: invoices.reduce((s, i) => s + (i.taxableValue || i.subTotal || 0), 0),
      cgst:    invoices.reduce((s, i) => s + (i.cgstAmount  || 0), 0),
      sgst:    invoices.reduce((s, i) => s + (i.sgstAmount  || 0), 0),
      igst:    invoices.reduce((s, i) => s + (i.igstAmount  || 0), 0),
      tax:     invoices.reduce((s, i) => s + (i.gstAmount   || 0), 0),
      grand:   invoices.reduce((s, i) => s + (i.grandTotal  || 0), 0),
    };

    return res.status(200).json({
      summary,
      parties: Object.values(partyMap).sort((a, b) => b.totals.grand - a.totals.grand),
    });
  } catch (err) {
    console.error("GST REPORT ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
