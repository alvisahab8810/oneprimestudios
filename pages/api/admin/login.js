


// import { serialize } from "cookie";
// import dbConnect from "@/lib/dbConnect";
// import Admin from "@/models/Admin";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).json({ success: false });

//   await dbConnect();

//   const { email, password } = req.body;
//   if (!email || !password) {
//     return res.status(400).json({ success: false, message: "Email and password required" });
//   }

//   try {
//     const admin = await Admin.findOne({ email });
//     if (!admin) return res.status(401).json({ success: false, message: "Invalid credentials" });

//     const isMatch = await bcrypt.compare(password, admin.password);
//     if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

//     // Create JWT
//     const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

//     // Set cookie
//     const cookie = serialize("admin_auth", token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production" ? true : false,
//       sameSite: "lax",
//       path: "/",
//       maxAge: 60 * 60 * 24,
//     });

//     res.setHeader("Set-Cookie", cookie);
//     return res.status(200).json({ success: true, message: "Login successful" });
//   } catch (error) {
//     console.error("Login Error:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// }





import { serialize } from "cookie";
import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/Admin";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false });

  await dbConnect();

  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    // ✅ Create JWT that never expires
    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET.toString() // ensure it's a clean string
      // no expiresIn -> never expires
    );

    // ✅ Set secure, clean cookie
    const cookie = serialize("admin_auth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // never expires: 10 years (realistically)
      maxAge: 60 * 60 * 24 * 365 * 10,
    });

    res.setHeader("Set-Cookie", cookie);

    return res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}
