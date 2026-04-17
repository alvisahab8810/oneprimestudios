import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import User from "@/models/User";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const dbUser = await User.findById(user._id);
    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ Only partners allowed
    if (dbUser.userType !== "partner") {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      name,
      phone,
      companyName,
      gstNumber,
      businessAddress,
    } = req.body;

    // Basic validation
    if (gstNumber && gstNumber.length < 10) {
      return res.status(400).json({ message: "Invalid GST number" });
    }

    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: "Enter a valid 10-digit mobile number" });
    }

    // ✅ Update allowed fields only
    if (name) dbUser.name = name;
    if (phone) dbUser.phone = phone;
    if (companyName) dbUser.companyName = companyName;
    if (gstNumber) dbUser.gstNumber = gstNumber;
    if (businessAddress) dbUser.businessAddress = businessAddress;

    await dbUser.save();

    res.json({
      success: true,
      user: {
        name: dbUser.name,
        email: dbUser.email,
        phone: dbUser.phone,
        companyName: dbUser.companyName,
        gstNumber: dbUser.gstNumber,
        businessAddress: dbUser.businessAddress,
        memberId: dbUser.memberId,
        userType: dbUser.userType,
      },
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
