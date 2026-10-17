import dbConnect from "@/lib/dbConnect";
import ContactLead from "@/models/ContactLead";
import { requireAdminPermission } from "@/lib/adminAuth";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Leads carry a customer name, email and phone, so only an admin reads them
  const admin = await requireAdminPermission(req, res, "leads");
  if (!admin) return;

  try {
    const leads = await ContactLead.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: leads });
  } catch (error) {
    console.error("Lead Fetch Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
