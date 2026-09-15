// pages/api/admin/eway-bills/[invoiceId].js
// GET — invoice + its e-way bill (or a draft prefilled from the invoice)
// PUT — Part A / Part B save.  action:"generate" -> validate, then GENERATED
//                              action:"cancel"   -> CANCELLED
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import EwayBill from "@/models/EwayBill";
import {
  EWAY_THRESHOLD, draftFromInvoice, withInvoiceDefaults, goodsFromInvoice,
  computeValidUpto, missingForGenerate,
} from "@/lib/ewayBill";

const EDITABLE = [
  "ewbNumber", "supplyType", "subSupplyType", "documentType", "transactionType",
  "billTo", "dispatchFrom", "shipTo", "transportMode", "vehicleType", "vehicleNumber",
  "transporterName", "transporterId", "transportDocNo", "transportDocDate", "distanceKm", "cewbNumber",
];

export default async function handler(req, res) {
  const { invoiceId } = req.query;

  try {
    await dbConnect();

    const invoice = await Invoice.findById(invoiceId).lean();
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    let bill = await EwayBill.findOne({ invoiceId });

    if (req.method === "GET") {
      return res.status(200).json({
        invoice,
        ewayBill: bill ? withInvoiceDefaults(bill.toObject(), invoice) : draftFromInvoice(invoice),
        isSaved: !!bill,
        required: Number(invoice.grandTotal || 0) > EWAY_THRESHOLD,
      });
    }

    if (req.method !== "PUT") return res.status(405).json({ message: "Method not allowed" });
    if (bill?.status === "CANCELLED")
      return res.status(400).json({ message: "A cancelled e-way bill cannot be edited" });

    const { action, ...body } = req.body || {};
    if (!bill) bill = new EwayBill(draftFromInvoice(invoice));

    for (const k of EDITABLE) if (k in body) bill.set(k, body[k]);
    if ("generatedAt" in body) bill.generatedAt = body.generatedAt ? new Date(body.generatedAt) : null;

    // Goods always follow the invoice; only HSN / qty / unit are taken from the request.
    bill.goods = goodsFromInvoice(invoice, Array.isArray(body.goods) ? body.goods : bill.goods || []);
    if (!bill.billTo?.name) bill.billTo = withInvoiceDefaults({}, invoice).billTo;

    bill.ewbNumber = String(bill.ewbNumber || "").replace(/\s/g, "");
    bill.cewbNumber = String(bill.cewbNumber || "").replace(/\s/g, "");
    bill.vehicleNumber = String(bill.vehicleNumber || "").replace(/[\s-]/g, "").toUpperCase();
    bill.transporterId = String(bill.transporterId || "").trim().toUpperCase();
    if (bill.billTo) bill.billTo.gstin = String(bill.billTo.gstin || "").trim().toUpperCase();

    if (action === "generate") {
      const missing = missingForGenerate(bill);
      if (missing.length)
        return res.status(400).json({ message: `Please fill in: ${missing.join(", ")}`, missing });
      bill.status = "GENERATED";
      if (!bill.generatedAt) bill.generatedAt = new Date();
    } else if (action === "cancel") {
      bill.status = "CANCELLED";
    }

    // recompute validity in case generated time / distance / vehicle type changed
    bill.validUpto = bill.generatedAt ? computeValidUpto(bill.generatedAt, bill.distanceKm, bill.vehicleType) : null;

    await bill.save();
    return res.status(200).json({ ewayBill: withInvoiceDefaults(bill.toObject(), invoice), isSaved: true });
  } catch (err) {
    console.error("EWAY SAVE ERROR:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
