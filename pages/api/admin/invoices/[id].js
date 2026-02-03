import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const { id } = req.query;

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.status(200).json(invoice);

  } catch (error) {
    console.error("INVOICE VIEW ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
