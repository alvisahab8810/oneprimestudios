import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import User from "@/models/User";
import {
  normalizeAddress,
  validateAddress,
  mirrorDefaultAddress,
  sortAddresses,
} from "@/lib/addressRules";

// One saved address.
//
// PUT    -> replace it
// PATCH  -> make it the default delivery address
// DELETE -> remove it

export default async function handler(req, res) {
  await dbConnect();

  if (!["PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "PUT, PATCH, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    if (user.userType === "partner") {
      return res.status(403).json({
        message: "Partner addresses are managed from the partner profile.",
      });
    }

    const dbUser = await User.findById(user._id);
    if (!dbUser) return res.status(404).json({ message: "User not found" });

    const entry = (dbUser.addresses || []).id(req.query.id);
    if (!entry) return res.status(404).json({ message: "Address not found" });

    if (req.method === "DELETE") {
      const wasDefault = entry.isDefault;
      entry.deleteOne();

      // The book is never left without a default while it still has entries
      if (wasDefault && dbUser.addresses.length) {
        dbUser.addresses[0].isDefault = true;
      }

      mirrorDefaultAddress(dbUser);
      await dbUser.save();

      return res.json({
        success: true,
        message: "Address removed.",
        addresses: sortAddresses(dbUser.addresses),
      });
    }

    if (req.method === "PATCH") {
      dbUser.addresses.forEach((a) => (a.isDefault = false));
      entry.isDefault = true;
      mirrorDefaultAddress(dbUser);
      await dbUser.save();

      return res.json({
        success: true,
        message: "Default delivery address updated.",
        addresses: sortAddresses(dbUser.addresses),
      });
    }

    const payload = normalizeAddress(req.body);
    const errors = validateAddress(payload);
    if (Object.keys(errors).length) {
      return res.status(400).json({
        message: "Please correct the highlighted fields.",
        errors,
      });
    }

    Object.assign(entry, payload);

    if (req.body?.isDefault) {
      dbUser.addresses.forEach((a) => (a.isDefault = false));
      entry.isDefault = true;
    }

    mirrorDefaultAddress(dbUser);
    await dbUser.save();

    return res.json({
      success: true,
      message: "Address updated.",
      addresses: sortAddresses(dbUser.addresses),
    });
  } catch (err) {
    console.error("Address update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
