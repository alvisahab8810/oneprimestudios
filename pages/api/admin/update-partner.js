// pages/api/admin/update-partner.js
// Lets an admin correct a partner's own details from the Partner Approvals page.
// Everything the partner filled in at signup can be fixed here except the
// password (reset-partner-password) and approval (approve-partner), which have
// their own routes so their emails and logs stay separate.
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { requireAdminPermission } from "@/lib/adminAuth";
import { logActivity } from "@/lib/logActivity";

// Only these fields may be written, so a crafted request cannot touch the
// password hash, the user type or the approval flag
const EDITABLE_FIELDS = [
  "name",
  "companyName",
  "gstNumber",
  "businessAddress",
  "city",
  "state",
  "pinCode",
  "phone",
  "email",
  "memberId",
];

const clean = (value) => String(value ?? "").trim();

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const admin = await requireAdminPermission(req, res, "partners");
  if (!admin) return;

  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    const partner = await User.findById(userId);
    if (!partner || partner.userType !== "partner") {
      return res.status(404).json({ message: "Partner not found" });
    }

    const update = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] === undefined) continue;
      update[field] = clean(req.body[field]);
    }

    // Name, phone and email are what the partner logs in and is contacted with,
    // so none of them may be blanked out
    if ("name" in update && !update.name) {
      return res.status(400).json({ message: "Name is required" });
    }
    if ("phone" in update && !/^\d{10}$/.test(update.phone)) {
      return res.status(400).json({ message: "Phone must be a 10-digit number" });
    }
    if ("email" in update && !/^\S+@\S+\.\S+$/.test(update.email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    if (update.pinCode && !/^\d{6}$/.test(update.pinCode)) {
      return res.status(400).json({ message: "Pincode must be a 6-digit number" });
    }
    if (update.gstNumber) {
      update.gstNumber = update.gstNumber.toUpperCase();
      if (update.gstNumber.length !== 15) {
        return res.status(400).json({ message: "GST number must be 15 characters" });
      }
    }
    if ("email" in update) update.email = update.email.toLowerCase();

    // Email, phone and member ID identify one account each, and GST identifies
    // one business, so a clash with another account is refused up front instead
    // of surfacing as a database error
    const uniqueChecks = [
      ["email", "Another account already uses this email"],
      ["phone", "Another account already uses this phone number"],
      ["memberId", "Another partner already uses this member ID"],
      ["gstNumber", "Another partner already uses this GST number"],
    ];
    for (const [field, message] of uniqueChecks) {
      if (!update[field]) continue;
      const clash = await User.findOne({
        _id: { $ne: partner._id },
        [field]: update[field],
      }).select("_id");
      if (clash) return res.status(409).json({ message });
    }

    const changed = EDITABLE_FIELDS.filter(
      (f) => f in update && clean(partner[f]) !== update[f]
    );

    Object.assign(partner, update);
    await partner.save();

    const saved = partner.toObject();
    delete saved.password;
    delete saved.resetPasswordToken;
    delete saved.resetPasswordExpires;

    res.status(200).json({ message: "Partner details updated", user: saved });

    logActivity(
      req,
      "partner_updated",
      changed.length
        ? `Partner "${saved.name}" (${saved.email}) updated: ${changed.join(", ")}`
        : `Partner "${saved.name}" (${saved.email}) saved with no changes`,
      {
        entity: "user",
        entityId: String(saved._id),
        meta: { userName: saved.name, userEmail: saved.email, fields: changed },
      }
    );
  } catch (error) {
    console.error("Partner update error:", error);
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: "Another account already uses one of these details" });
    }
    return res.status(500).json({ message: "Server error" });
  }
}
