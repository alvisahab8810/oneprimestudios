// pages/api/auth/reset-password.js
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();

    const { token, id, newPassword } = req.body;
    if (!token || !id || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // ✅ Match user id
    if (decoded.id !== id) {
      return res.status(400).json({ message: "Token does not match this user" });
    }

    // ✅ Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ Update user password
    await User.findByIdAndUpdate(id, { password: hashedPassword });

    return res.status(200).json({ message: "Password has been reset successfully!" });

  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
