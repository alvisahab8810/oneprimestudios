import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ message: "invoiceId is required" });
    }

    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (invoice.status === "SENT") {
      return res.status(400).json({ message: "Invoice already sent" });
    }

    // 🔒 LOCK INVOICE
    invoice.status = "SENT";
    invoice.sentAt = new Date();

    await invoice.save();

    return res.status(200).json({
      message: "Invoice sent successfully"
    });

  } catch (error) {
    console.error("SEND INVOICE ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
