// pages/api/admin/eway-bills/index.js
// GET — all invoices above ₹50,000 with their e-way bill status.
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import EwayBill from "@/models/EwayBill";
import { EWAY_THRESHOLD } from "@/lib/ewayBill";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const { status, search } = req.query;

    const invoices = await Invoice.find({
      grandTotal: { $gt: EWAY_THRESHOLD },
      status: { $ne: "CANCELLED" },
    })
      .select("invoiceNumber invoiceDate createdAt partnerName partnerAddress shipToAddress grandTotal status")
      .sort({ createdAt: -1 })
      .lean();

    const bills = await EwayBill.find({ invoiceId: { $in: invoices.map((i) => i._id) } }).lean();
    const byInvoice = Object.fromEntries(bills.map((b) => [String(b.invoiceId), b]));

    let rows = invoices.map((inv) => {
      const b = byInvoice[String(inv._id)];
      return {
        invoiceId:     inv._id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate:   inv.invoiceDate || inv.createdAt,
        partyName:     inv.partnerAddress?.companyName || inv.partnerName,
        partyGstin:    inv.partnerAddress?.gst || "",
        toCity:        (inv.shipToAddress?.city || inv.partnerAddress?.city || ""),
        value:         inv.grandTotal,
        ewbStatus:     b ? b.status : "PENDING", // PENDING = not created yet
        ewbNumber:     b?.ewbNumber || "",
        validUpto:     b?.validUpto || null,
        vehicleNumber: b?.vehicleNumber || "",
        pdfUrl:        b?.pdfUrl || "",
        partyEmail:    inv.partnerAddress?.email || "",
        sentAt:        b?.sentAt || null,
        sentTo:        b?.sentTo || "",
      };
    });

    const counts = rows.reduce((c, r) => ({ ...c, [r.ewbStatus]: (c[r.ewbStatus] || 0) + 1 }), { ALL: rows.length });

    if (status) rows = rows.filter((r) => r.ewbStatus === status);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        [r.invoiceNumber, r.partyName, r.partyGstin, r.ewbNumber, r.vehicleNumber]
          .some((v) => String(v || "").toLowerCase().includes(q))
      );
    }

    return res.status(200).json({ rows, counts, threshold: EWAY_THRESHOLD });
  } catch (err) {
    console.error("EWAY LIST ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
