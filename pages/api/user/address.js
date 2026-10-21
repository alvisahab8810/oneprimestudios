import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import User from "@/models/User";

// A retail shopper keeps one shipping address on their own account. It lives on
// the user document in the same fields checkout prefills from, so an address
// saved here is the address the next order goes out to.
//
// GET  -> the saved address
// PUT  -> replace it
//
// Partner profiles are edited from /api/user/update instead, because their
// address doubles as the billing address on a GST invoice.

// Same rules as the checkout form, so an address accepted here never fails there
function validateAddress({ name, phone, street, city, state, pinCode }) {
  const errors = {};

  if (!name) errors.name = "Full name is required.";
  else if (!/^[A-Za-z\s]+$/.test(name)) errors.name = "Name can only contain letters.";

  if (!phone) errors.phone = "Phone number is required.";
  else if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = "Phone number must be 10 digits.";

  if (!street) errors.street = "Street address is required.";
  else if (street.length < 5) errors.street = "Street address seems too short.";

  if (!city) errors.city = "City is required.";
  if (!state) errors.state = "State is required.";

  if (!pinCode) errors.pinCode = "Pin code is required.";
  else if (!/^\d{6}$/.test(pinCode)) errors.pinCode = "Pin code must be 6 digits.";

  return errors;
}

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
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

    if (req.method === "GET") {
      return res.json({
        address: {
          name: user.name || "",
          phone: user.phone || "",
          street: user.businessAddress || "",
          city: user.city || "",
          state: user.state || "",
          pinCode: user.pinCode || "",
        },
      });
    }

    const payload = {
      name: String(req.body?.name || "").trim(),
      phone: String(req.body?.phone || "").trim(),
      street: String(req.body?.street || "").trim(),
      city: String(req.body?.city || "").trim(),
      state: String(req.body?.state || "").trim(),
      pinCode: String(req.body?.pinCode || "").trim(),
    };

    const errors = validateAddress(payload);
    if (Object.keys(errors).length) {
      return res.status(400).json({
        message: "Please correct the highlighted fields.",
        errors,
      });
    }

    // The phone number is the account's login handle, so a clash has to be
    // caught here rather than surfacing as a duplicate key error.
    if (payload.phone !== user.phone) {
      const taken = await User.exists({
        _id: { $ne: user._id },
        phone: payload.phone,
      });

      if (taken) {
        return res.status(400).json({
          message: "This phone number is already registered to another account.",
          errors: { phone: "This phone number is already in use." },
        });
      }
    }

    const dbUser = await User.findById(user._id);
    if (!dbUser) return res.status(404).json({ message: "User not found" });

    dbUser.name = payload.name;
    dbUser.phone = payload.phone;
    dbUser.businessAddress = payload.street;
    dbUser.city = payload.city;
    dbUser.state = payload.state;
    dbUser.pinCode = payload.pinCode;

    await dbUser.save();

    return res.json({
      success: true,
      message: "Address saved.",
      address: payload,
      user: { name: dbUser.name, email: dbUser.email, phone: dbUser.phone },
    });
  } catch (err) {
    console.error("Address update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
