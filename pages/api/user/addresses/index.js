import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import User from "@/models/User";
import {
  normalizeAddress,
  validateAddress,
  legacyAddressOf,
  mirrorDefaultAddress,
  sortAddresses,
} from "@/lib/addressRules";

// The shopper's address book.
//
// GET  -> every saved address, newest last, default first
// POST -> add one
//
// A partner's address doubles as the billing address on their GST invoice, so
// they keep the single one on their profile instead.

const MAX_ADDRESSES = 10;

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
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

    if (req.method === "GET") {
      // First visit after the address book went live: carry the one address
      // already on the account into the list so it is not lost
      if (!dbUser.addresses?.length) {
        const legacy = legacyAddressOf(dbUser);
        if (legacy) {
          dbUser.addresses.push(legacy);
          await dbUser.save();
        }
      }

      return res.json({ addresses: sortAddresses(dbUser.addresses || []) });
    }

    if ((dbUser.addresses?.length || 0) >= MAX_ADDRESSES) {
      return res.status(400).json({
        message: `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.`,
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

    // The very first address is the default whatever was asked for, and
    // choosing a new default has to clear the old one
    const wantsDefault = !!req.body?.isDefault || !dbUser.addresses?.length;
    if (wantsDefault) dbUser.addresses.forEach((a) => (a.isDefault = false));

    dbUser.addresses.push({ ...payload, isDefault: wantsDefault });
    mirrorDefaultAddress(dbUser);
    await dbUser.save();

    return res.status(201).json({
      success: true,
      message: "Address added.",
      addresses: sortAddresses(dbUser.addresses),
    });
  } catch (err) {
    console.error("Address book error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
