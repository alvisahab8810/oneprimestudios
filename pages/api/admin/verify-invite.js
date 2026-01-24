import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/Admin";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ message: "Token missing" });
  }

  try {
    const admin = await Admin.findOne({
      inviteToken: token,
      inviteExpires: { $gt: new Date() },
    });

    if (!admin) {
      return res.status(400).json({ message: "Invite expired or invalid" });
    }

    // 🔐 TEMP invite session (15 minutes)
    const inviteSession = jwt.sign(
      {
        id: admin._id,
        type: "invite",
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.setHeader(
      "Set-Cookie",
      `invite_auth=${inviteSession}; HttpOnly; Path=/; SameSite=Lax`
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Verify Invite Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
