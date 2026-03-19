// pages/api/admin/invoices/[id].js
// GET    — fetch single invoice
// PUT    — edit DRAFT invoice (items, GST, remarks, partnerType)
// DELETE — cancel invoice
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";

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
      if (invoice.status === "SENT") {
        return res.status(400).json({ message: "Cannot edit a SENT invoice" });
      }

      const {
        items, gstPercent, gstType, partnerType,
        remarks, sellerGst, sellerAddress,
      } = req.body;

      if (items) {
        const subTotal     = items.reduce((s, i) => s + Number(i.amount || 0), 0);
        const taxableValue = subTotal;
        const pct          = Number(gstPercent ?? invoice.gstPercent);
        const type         = gstType ?? invoice.gstType;

        let cgstPercent = 0, sgstPercent = 0, igstPercent = 0;
        let cgstAmount  = 0, sgstAmount  = 0, igstAmount  = 0;

        if (type === "INTRA") {
          cgstPercent = pct / 2; sgstPercent = pct / 2;
          cgstAmount  = (taxableValue * cgstPercent) / 100;
          sgstAmount  = (taxableValue * sgstPercent) / 100;
        } else if (type === "INTER") {
          igstPercent = pct;
          igstAmount  = (taxableValue * igstPercent) / 100;
        }

        const gstAmount  = cgstAmount + sgstAmount + igstAmount;
        const grandTotal = taxableValue + gstAmount;

        invoice.items          = items.map(i => ({ ...i, taxableAmount: Number(i.amount || 0) }));
        invoice.subTotal       = subTotal;
        invoice.taxableValue   = taxableValue;
        invoice.gstPercent     = pct;
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
