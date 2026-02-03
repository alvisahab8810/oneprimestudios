import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import { sendInvoiceEmail } from "@/lib/sendInvoiceEmail";
import path from "path";
import fs from "fs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ message: "invoiceId required" });
    }

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice || !invoice.pdfUrl) {
      return res.status(400).json({ message: "Invoice PDF not available" });
    }

    const pdfPath = path.join(process.cwd(), "public", invoice.pdfUrl);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ message: "PDF file not found" });
    }

    await sendInvoiceEmail({
      to: invoice.partnerAddress?.email,
      subject: `Invoice ${invoice.invoiceNumber} | One Prime Studios`,
      invoiceNumber: invoice.invoiceNumber,
      pdfPath,
      html: `
        <p>Dear ${invoice.partnerName},</p>
        <p>Please find attached your invoice <strong>${invoice.invoiceNumber}</strong>.</p>
        <p>If you have any questions, feel free to contact us.</p>
        <br/>
        <p>Regards,<br/>One Prime Studios</p>
      `,
    });

    return res.status(200).json({
      message: "Invoice email sent successfully",
    });

  } catch (error) {
    console.error("SEND INVOICE EMAIL ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
