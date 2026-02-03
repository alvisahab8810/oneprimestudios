import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const invoices = await Invoice.find()
      .sort({ createdAt: -1 });

    return res.status(200).json(invoices);

  } catch (error) {
    console.error("ADMIN INVOICE LIST ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
