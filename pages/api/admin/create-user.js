import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/Admin";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "@/lib/sendEmail";


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  try {
    // 1️⃣ Read JWT from cookie
    const token = req.cookies.admin_auth;

    console.log("COOKIES:", req.cookies);
console.log("TOKEN:", req.cookies?.admin_auth);

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 2️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("DECODED JWT:", decoded);

    // 3️⃣ Super Admin check
   if (decoded.role !== "admin") {
  return res.status(403).json({ message: "Access denied" });
}

    // 4️⃣ Validate input
    const { name, email, role } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 5️⃣ Prevent duplicate email
    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // 6️⃣ Generate invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hrs

    // 7️⃣ Create OPS user (inactive, no password yet)
    await Admin.create({
      name,
      email,
      role,
      password: "INVITED_USER", // placeholder to avoid breaking schema
      isActive: false,
      inviteToken,
      inviteExpires,
    });


    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/verify?token=${inviteToken}`;


await sendEmail({
  to: email,
  subject: "You are invited to Viralon Prints Admin Panel",
  html: `
    <div style="font-family: Arial, sans-serif;">
      <p>Hi <b>${name}</b>,</p>

      <p>You have been invited to join <b>Viralon Prints</b> as a <b>${role.replace("_", " ")}</b>.</p>

      <p>Please click the button below to set your password:</p>

      <p>
        <a href="${inviteLink}"
           style="
             display:inline-block;
             padding:10px 16px;
             background:#0d6efd;
             color:#fff;
             text-decoration:none;
             border-radius:4px;
           ">
          Set Password
        </a>
      </p>

      <p>This link is valid for <b>24 hours</b>.</p>

      <p>If you did not expect this email, you can safely ignore it.</p>

      <br/>
      <p>— Viralon Prints Team</p>
    </div>
  `,
});


    // 8️⃣ Success response
    return res.status(201).json({
      success: true,
      message: "Invite created successfully",
    });
  } catch (error) {
    console.error("Create User Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
