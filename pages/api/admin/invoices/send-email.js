import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import { sendInvoiceEmail } from "@/lib/sendInvoiceEmail";
import { requireAdminPermission } from "@/lib/adminAuth";
import { renderInvoicePdf } from "@/pages/api/admin/invoices/generate-pdf";
import { findStoredPdf, pdfFilename } from "@/lib/documentStorage";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();
  const admin = await requireAdminPermission(req, res, "invoices");
  if (!admin) return;

  try {
    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ message: "invoiceId required" });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const inv = invoice.toObject ? invoice.toObject() : invoice;

    // The PDF no longer sits in /public, so it is looked up on disk and
    // rendered when it is not there, rather than the email going out bare
    const name = pdfFilename(inv.invoiceNumber);
    let pdfPath = findStoredPdf("invoice", name) || findStoredPdf("invoice", `${inv.invoiceNumber}.pdf`);

    if (!pdfPath) {
      const built = await renderInvoicePdf(invoice._id);
      pdfPath = built.filePath;
    }

    const attachments = [{ filename: name, path: pdfPath }];

    const html = `
      <p>Dear ${inv.partnerName || "Customer"},</p>
      <p>Please find your invoice <strong>${inv.invoiceNumber}</strong> attached to this email.</p>
      <p>If you have any questions, feel free to contact us at <a href="mailto:admin@oneprimestudios.com">admin@oneprimestudios.com</a> or call <strong>8081815141</strong>.</p>
      <br/>
      <p>Regards,<br/><strong>One Prime Studios</strong></p>
    `;

    await sendInvoiceEmail({
      to:          inv.partnerAddress?.email,
      subject:     `Invoice ${inv.invoiceNumber} | One Prime Studios`,
      html,
      attachments,
    });

    return res.status(200).json({ message: "Invoice email sent successfully" });

  } catch (error) {
    console.error("SEND INVOICE EMAIL ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
