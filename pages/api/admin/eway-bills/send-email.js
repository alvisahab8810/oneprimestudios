// pages/api/admin/eway-bills/send-email.js
// POST { invoiceId, to? } — regenerates the e-way bill PDF with the latest details and
// emails it to the customer (same flow as "Send Invoice").
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import EwayBill from "@/models/EwayBill";
import { sendInvoiceEmail } from "@/lib/sendInvoiceEmail";
import { renderEwayBillPdf } from "@/lib/ewayBillPdf";
import { ewbDate, ewbDateTime, ewbNumberFmt } from "@/lib/ewayBill";

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ESC_MAP[c]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();
    const { invoiceId, to } = req.body || {};
    if (!invoiceId) return res.status(400).json({ message: "invoiceId required" });

    const bill = await EwayBill.findOne({ invoiceId });
    if (!bill) return res.status(404).json({ message: "E-way bill not found" });
    if (bill.status !== "GENERATED")
      return res.status(400).json({ message: "Only a GENERATED e-way bill can be emailed" });

    const inv = await Invoice.findById(invoiceId).lean();
    if (!inv) return res.status(404).json({ message: "Invoice not found" });

    const email = String(to || inv.partnerAddress?.email || "").trim();
    if (!email) return res.status(400).json({ message: "Customer email address is missing" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });

    // Always attach a fresh PDF so the customer gets the latest vehicle / validity details.
    const { filePath, filename } = await renderEwayBillPdf(bill, inv);

    const ewb = ewbNumberFmt(bill.ewbNumber);
    const from = [bill.dispatchFrom?.city, bill.dispatchFrom?.state].filter(Boolean).join(", ");
    const toPlace = [bill.shipTo?.city, bill.shipTo?.state].filter(Boolean).join(", ");
    const row = (k, v) =>
      `<tr><td style="padding:6px 14px 6px 0;color:#6b7280">${k}</td><td style="padding:6px 0;font-weight:600">${esc(v || "-")}</td></tr>`;

    const html = `
      <p>Dear ${esc(inv.partnerName || "Customer")},</p>
      <p>Your consignment against invoice <strong>${esc(inv.invoiceNumber)}</strong> has been dispatched. The E-Way Bill is attached to this email.</p>
      <table style="border-collapse:collapse;font-size:14px;margin:12px 0">
        ${row("E-Way Bill No.", ewb)}
        ${row("Invoice No.", `${inv.invoiceNumber} (${ewbDate(inv.invoiceDate || inv.createdAt)})`)}
        ${row("Invoice Value", `Rs. ${Number(inv.grandTotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`)}
        ${row("From", from)}
        ${row("To", toPlace)}
        ${row("Mode", bill.transportMode)}
        ${bill.vehicleNumber ? row("Vehicle No.", bill.vehicleNumber) : ""}
        ${bill.transporterName ? row("Transporter", bill.transporterName) : ""}
        ${row("Generated On", ewbDateTime(bill.generatedAt))}
        ${row("Valid Until", ewbDate(bill.validUpto))}
      </table>
      <p>If you have any questions, feel free to contact us at <a href="mailto:admin@oneprimestudios.com">admin@oneprimestudios.com</a> or call <strong>8081815141</strong>.</p>
      <br/>
      <p>Regards,<br/><strong>One Prime Studios</strong></p>
    `;

    await sendInvoiceEmail({
      to: email,
      subject: `E-Way Bill ${ewb} for Invoice ${inv.invoiceNumber} | One Prime Studios`,
      html,
      attachments: [{ filename, path: filePath }],
    });

    bill.sentAt = new Date();
    bill.sentTo = email;
    await bill.save();
    return res.status(200).json({ message: "E-way bill emailed", sentAt: bill.sentAt, sentTo: email, pdfUrl: bill.pdfUrl });
  } catch (err) {
    console.error("EWAY EMAIL ERROR:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
}
