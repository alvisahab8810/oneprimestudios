



// import dbConnect from "@/lib/dbConnect";
// import Admin from "@/models/Admin";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   if (req.method !== "POST")
//     return res.status(405).json({ success: false, message: "Method not allowed" });

//   await dbConnect();

//   const { email, password } = req.body;
//   if (!email || !password)
//     return res.status(400).json({ success: false, message: "Email and password required" });

//   try {
//     const admin = await Admin.findOne({ email });
//     if (!admin)
//       return res.status(401).json({ success: false, message: "Invalid credentials" });

//     const isMatch = await bcrypt.compare(password, admin.password);
//     if (!isMatch)
//       return res.status(401).json({ success: false, message: "Invalid credentials" });

//     // ✅ Create token with role
//     const token = jwt.sign(
//       { id: admin._id.toString(), role: admin.role },
//       process.env.JWT_SECRET,
//       { expiresIn: "365d" } // valid for 1 year
//     );

//     // ✅ Safe, clean cookie
//     res.setHeader(
//       "Set-Cookie",
//       `admin_auth=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 365
//       }; SameSite=Lax`
//     );

//     return res.status(200).json({ success: true, message: "Login successful" });
//   } catch (error) {
//     console.error("Login Error:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// }





// import dbConnect from "@/lib/dbConnect";
// import Admin from "@/models/Admin";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   await dbConnect();

//   const { email, password } = req.body;
//   if (!email || !password)
//     return res.status(400).json({ message: "Email and password required" });

//   try {
//     const admin = await Admin.findOne({ email });
//     if (!admin)
//       return res.status(401).json({ message: "Invalid credentials" });

//     const isMatch = await bcrypt.compare(password, admin.password);
//     if (!isMatch)
//       return res.status(401).json({ message: "Invalid credentials" });

//     // Create JWT
//     const token = jwt.sign(
//       { id: admin._id, role: "admin" },
//       process.env.JWT_SECRET,
//       { expiresIn: "365d" }
//     );

//     // Cookie setup (safe for both localhost and production)
//     const isProd = process.env.NODE_ENV === "production";
//     res.setHeader(
//       "Set-Cookie",
//       `admin_auth=${token}; HttpOnly; Path=/; Max-Age=${
//         60 * 60 * 24 * 365
//       }; SameSite=Lax${isProd ? "; Secure" : ""}`
//     );

//     res.status(200).json({
//       success: true,
//       message: "Login successful",
//       redirect: "/dashboard/",
//     });
//   } catch (err) {
//     console.error("Login Error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// }















// import dbConnect from "@/lib/dbConnect";
// import Admin from "@/models/Admin";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   await dbConnect();

//   const { email, password } = req.body;
//   if (!email || !password)
//     return res.status(400).json({ message: "Email and password required" });

//   try {
//     const admin = await Admin.findOne({ email });
//     if (!admin)
//       return res.status(401).json({ message: "Invalid credentials" });

//     const isMatch = await bcrypt.compare(password, admin.password);
//     if (!isMatch)
//       return res.status(401).json({ message: "Invalid credentials" });

//     // Create JWT
//     const token = jwt.sign(
//       { id: admin._id, role: "admin" },
//       process.env.JWT_SECRET,
//       { expiresIn: "365d" }
//     );

//     // Cookie setup (safe for both localhost and production)
//     const isProd = process.env.NODE_ENV === "production";
//     res.setHeader(
//       "Set-Cookie",
//       `admin_auth=${token}; HttpOnly; Path=/; Max-Age=${
//         60 * 60 * 24 * 365
//       }; SameSite=Lax${isProd ? "; Secure" : ""}`
//     );

//     // res.status(200).json({
//     //   success: true,
//     //   message: "Login successful",
//     //   redirect: "/dashboard/",
//     // });


//     let redirect = "/dashboard"; // admin default

// if (admin.role === "designer") {
//   redirect = "/dashboard/designer";
// } else if (admin.role === "product_manager") {
//   redirect = "/dashboard/product-manager";
// } else if (admin.role === "manager") {
//   redirect = "/dashboard/manager";
// }

// res.status(200).json({
//   success: true,
//   message: "Login successful",
//   redirect,
// });

//   } catch (err) {
//     console.error("Login Error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// }










import dbConnect from "@/lib/dbConnect";
import Admin from "@/models/Admin";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logActivity } from "@/lib/logActivity";

// Behind a proxy (nginx/pm2) the socket address is the proxy, so the
// forwarded header is what actually identifies the person signing in.
function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim()) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  await dbConnect();

  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // Suspended by the super admin, or still waiting on the invite
    if (admin.isActive === false) {
      return res.status(403).json({
        message: "This account is not active. Please contact your administrator.",
      });
    }

    // 🔐 CREATE JWT (ROLE MUST COME FROM DB)
    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role,   // ✅ FIXED
        email: admin.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "365d" }
    );

    const isProd = process.env.NODE_ENV === "production";
    res.setHeader(
      "Set-Cookie",
      `admin_auth=${token}; HttpOnly; Path=/; Max-Age=${
        60 * 60 * 24 * 365
      }; SameSite=Lax${isProd ? "; Secure" : ""}`
    );

    // Login time + history. A failure here must never block the sign-in.
    const loginAt = new Date();
    const ip = clientIp(req);
    try {
      await Admin.updateOne(
        { _id: admin._id },
        { $set: { lastLoginAt: loginAt, lastLoginIp: ip }, $inc: { loginCount: 1 } },
      );
      await logActivity(req, "admin_login", admin.name + " signed in", {
        entity: "admin",
        entityId: admin._id,
        adminId: admin._id,
        adminName: admin.name,
        adminEmail: admin.email,
        meta: { ip, role: admin.role, userAgent: req.headers["user-agent"] || "" },
      });
    } catch (logErr) {
      console.error("Login tracking error:", logErr.message);
    }

    // 🎯 ROLE-BASED REDIRECT
    let redirect = "/dashboard";

    if (admin.role === "designer") {
      redirect = "/dashboard/designer";
    } else if (admin.role === "product_manager") {
      redirect = "/dashboard/product-manager";
    } else if (admin.role === "manager") {
      redirect = "/dashboard/manager";
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      redirect,
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
}
