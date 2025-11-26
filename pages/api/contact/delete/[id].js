import dbConnect from "@/lib/dbConnect";
import ContactLead from "@/models/ContactLead";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    await ContactLead.findByIdAndDelete(id);

    return res.status(200).json({ message: "Lead deleted" });
  } catch (error) {
    console.error("Delete Lead Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
