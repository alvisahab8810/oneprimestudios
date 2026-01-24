import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/Admin";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  try {
    // 🔐 Read invite session cookie
    const inviteSession = req.cookies.invite_auth;
    if (!inviteSession) {
      return res.status(401).json({
        message: "Invite session expired. Please open invite link again.",
      });
    }

    // 🔍 Verify invite session
    const decoded = jwt.verify(inviteSession, process.env.JWT_SECRET);

    if (decoded.type !== "invite") {
      return res.status(401).json({ message: "Invalid invite session" });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // 🔎 Find invited user
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔐 Set password & activate
    admin.password = await bcrypt.hash(password, 10);
    admin.isActive = true;
    admin.inviteToken = null;
    admin.inviteExpires = null;

    await admin.save();

    // 🧹 Clear invite session cookie
    res.setHeader(
      "Set-Cookie",
      `invite_auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`
    );

    return res.json({
      success: true,
      message: "Password set successfully",
    });
  } catch (err) {
    console.error("Set Password Error:", err);
    return res.status(401).json({
      message: "Invite expired or invalid. Please request a new invite.",
    });
  }
}
