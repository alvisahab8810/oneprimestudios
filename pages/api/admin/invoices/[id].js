// pages/api/admin/invoices/[id].js
// GET    — fetch single invoice
// PUT    — edit DRAFT invoice (items, GST, remarks, partnerType)
// DELETE — cancel invoice
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import { computeGstBreakdown } from "@/utils/gstBreakdown";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    try {
      const invoice = await Invoice.findById(id).lean();
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      return res.status(200).json(invoice);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ── PUT: edit DRAFT invoice ───────────────────────────────────────────────
  if (req.method === "PUT") {
    try {
      const invoice = await Invoice.findById(id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });


      const {
        items, gstType, partnerType,
        remarks, sellerGst, sellerAddress,
      } = req.body;

      if (items) {
        // Each item carries its own GST % (from the product) — group by rate
        // and compute CGST/SGST/IGST per slab rather than one uniform rate.
        const enrichedItems = items.map(i => ({
          ...i,
          taxableAmount: Number(i.amount || 0),
          gstPercent: Number(i.gstPercent || 0),
        }));

        const subTotal     = enrichedItems.reduce((s, i) => s + Number(i.amount || 0), 0);
        const taxableValue = subTotal;
        const type         = gstType ?? invoice.gstType;

        const { totals } = type === "NONE"
          ? { totals: { taxable: taxableValue, cgst: 0, sgst: 0, igst: 0, tax: 0 } }
          : computeGstBreakdown(enrichedItems, type);

        const cgstAmount = totals.cgst;
        const sgstAmount = totals.sgst;
        const igstAmount = totals.igst;
        const gstAmount  = totals.tax;

        const blendedPercent = taxableValue > 0 ? (gstAmount / taxableValue) * 100 : 0;
        const cgstPercent = type === "INTRA" ? blendedPercent / 2 : 0;
        const sgstPercent = type === "INTRA" ? blendedPercent / 2 : 0;
        const igstPercent = type === "INTER" ? blendedPercent : 0;

        const couponDiscount = Number(invoice.couponDiscount || 0);
        const grandTotal     = taxableValue + gstAmount - couponDiscount;

        invoice.items          = enrichedItems;
        invoice.subTotal       = subTotal;
        invoice.taxableValue   = taxableValue;
        invoice.gstPercent     = blendedPercent;
        invoice.gstType        = type;
        invoice.cgstPercent    = cgstPercent;
        invoice.sgstPercent    = sgstPercent;
        invoice.igstPercent    = igstPercent;
        invoice.cgstAmount     = cgstAmount;
        invoice.sgstAmount     = sgstAmount;
        invoice.igstAmount     = igstAmount;
        invoice.gstAmount      = gstAmount;
        invoice.grandTotal     = grandTotal;
      }

      if (partnerType)   invoice.partnerType   = partnerType;
      if (remarks !== undefined) invoice.remarks = remarks;
      if (sellerGst)     invoice.sellerGst     = sellerGst;
      if (sellerAddress) invoice.sellerAddress = sellerAddress;

      invoice.status = "UPDATED";
      await invoice.save();

      return res.status(200).json({ message: "Invoice updated", invoice });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  // ── DELETE: cancel ────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    try {
      const invoice = await Invoice.findById(id);
      if (!invoice) return res.status(404).json({ message: "Not found" });
      invoice.status = "CANCELLED";
      await invoice.save();
      return res.status(200).json({ message: "Invoice cancelled" });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}



// import dbConnect from "@/lib/dbConnect";
// import Invoice from "@/models/Invoice";

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   try {
//     await dbConnect();

//     const { id } = req.query;

//     const invoice = await Invoice.findById(id);

//     if (!invoice) {
//       return res.status(404).json({ message: "Invoice not found" });
//     }

//     return res.status(200).json(invoice);

//   } catch (error) {
//     console.error("INVOICE VIEW ERROR:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// }
