// PATCH /api/contact/status/<id> — moves a contact lead to another stage, and
// optionally saves a short internal note against it.
import dbConnect from "@/lib/dbConnect";
import ContactLead from "@/models/ContactLead";
import { requireAdminPermission } from "@/lib/adminAuth";
import { LEAD_STATUSES } from "@/config/leadStatuses";

export default async function handler(req, res) {
  if (req.method !== "PATCH" && req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const admin = await requireAdminPermission(req, res, "leads");
  if (!admin) return;

  try {
    const { id } = req.query;
    const { status, note } = req.body || {};

    const update = {};

    if (status !== undefined) {
      if (!LEAD_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Unknown lead status" });
      }
      update.status = status;
      update.statusUpdatedAt = new Date();
    }

    if (note !== undefined) {
      update.note = String(note).trim().slice(0, 500);
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const lead = await ContactLead.findByIdAndUpdate(id, update, { new: true });
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    return res.status(200).json({ success: true, data: lead });
  } catch (error) {
    console.error("Lead Status Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
