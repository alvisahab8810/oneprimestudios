import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/logActivity";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ message: "userId and newPassword are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Password reset successfully" });

    logActivity(req, "partner_password_reset",
      `Password reset for partner "${user.name}" (${user.email})`,
      { entity: "user", entityId: String(user._id), meta: { userName: user.name, userEmail: user.email } }
    );
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ message: "Server error" });
  }
}
