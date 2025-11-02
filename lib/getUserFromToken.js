


// // lib/getUserFromToken.js
// import jwt from "jsonwebtoken";
// import dbConnect from "./dbConnect";
// import User from "@/models/User"; // update path if different

// export default async function getUserFromToken(authorizationHeader) {
//   if (!authorizationHeader) return null;
//   const parts = authorizationHeader.split(" ");
//   if (parts.length !== 2 || parts[0] !== "Bearer") return null;
//   const token = parts[1];
//   try {
//     const secret = process.env.JWT_SECRET;
//     if (!secret) throw new Error("JWT_SECRET not set");
//     const payload = jwt.verify(token, secret);
//     await dbConnect();
//     const user = await User.findById(payload.id).select("_id email name");
//     return user || null;
//   } catch (err) {
//     console.error("getUserFromToken error:", err?.message || err);
//     return null;
//   }
// }



// lib/getUserFromToken.js
import jwt from "jsonwebtoken";
import User from "@/models/User";
import cookie from "cookie";

export default async function getUserFromToken(maybeHeaderOrReq) {
  try {
    let token = null;

    // Case 1: passed header string like "Bearer <token>"
    if (typeof maybeHeaderOrReq === "string") {
      const header = maybeHeaderOrReq;
      if (header.startsWith("Bearer ")) token = header.split(" ")[1];
    }

    // Case 2: passed `req` object (Next.js API) -> check header then cookies
    else if (maybeHeaderOrReq && typeof maybeHeaderOrReq === "object") {
      const req = maybeHeaderOrReq;
      const authHeader = req.headers?.authorization || req?.headers?.Authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      } else if (req.headers?.cookie) {
        const parsed = cookie.parse(req.headers.cookie || "");
        // try common cookie names; add more if you use different names
        token = parsed.token || parsed.user_auth || parsed.admin_auth || parsed.session || null;
      } else if (req.cookies) {
        // Next.js may expose req.cookies
        token = req.cookies.token || req.cookies.user_auth || null;
      }
    }

    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) return null;
    const user = await User.findById(decoded.id).select("-password");
    return user || null;
  } catch (err) {
    // invalid token or user not found
    return null;
  }
}














// // lib/getUserFromToken.js
// import jwt from "jsonwebtoken";
// import User from "@/models/User";
// import cookie from "cookie";

// /**
//  * Universal helper to extract the logged-in user from:
//  * - Authorization header ("Bearer <token>")
//  * - Cookies (token, user_auth, admin_auth, etc.)
//  * Returns the full user object without password, or null if invalid.
//  */
// export default async function getUserFromToken(maybeHeaderOrReq) {
//   try {
//     let token = null;

//     // Case 1: Direct header string
//     if (typeof maybeHeaderOrReq === "string") {
//       const header = maybeHeaderOrReq.trim();
//       if (header.startsWith("Bearer ")) token = header.slice(7).trim();
//     }

//     // Case 2: Full Next.js/Express req object
//     else if (maybeHeaderOrReq && typeof maybeHeaderOrReq === "object") {
//       const req = maybeHeaderOrReq;

//       // 1️⃣ Try Authorization header
//       const authHeader = req.headers?.authorization || req.headers?.Authorization;
//       if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
//         token = authHeader.slice(7).trim();
//       }

//       // 2️⃣ Try cookies (standard or custom)
//       if (!token) {
//         let cookies = {};
//         if (req.headers?.cookie) cookies = cookie.parse(req.headers.cookie);
//         else if (req.cookies) cookies = req.cookies;

//         token =
//           cookies.token ||
//           cookies.user_auth ||
//           cookies.admin_auth ||
//           cookies.session ||
//           null;
//       }
//     }

//     if (!token) return null;

//     // 🧾 Verify token validity
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     if (!decoded?.id) return null;

//     // 🧑 Fetch user (excluding password)
//     const user = await User.findById(decoded.id).select("-password");
//     return user || null;
//   } catch (err) {
//     console.error("getUserFromToken error:", err.message);
//     return null;
//   }
// }






// // lib/getUserFromToken.js
// import jwt from "jsonwebtoken";
// import User from "@/models/User";
// import cookie from "cookie";

// /**
//  * Universal helper to extract the logged-in user from:
//  * - Authorization header ("Bearer <token>")
//  * - Cookies (token, user_auth, admin_auth)
//  */
// export default async function getUserFromToken(req) {
//   try {
//     let token = null;

//     // ✅ 1. Try Authorization header
//     const authHeader = req.headers?.authorization || req.headers?.Authorization;
//     if (authHeader?.startsWith("Bearer ")) {
//       token = authHeader.slice(7).trim();
//     }

//     // ✅ 2. Try cookies
//     if (!token) {
//       let cookies = {};

//       // Handles both Next.js and Node cookie formats
//       if (req.headers?.cookie) {
//         cookies = cookie.parse(req.headers.cookie);
//       } else if (req.cookies) {
//         // Newer Next.js sometimes parses cookies into an object already
//         cookies = req.cookies;
//       }

//       token =
//         cookies.admin_auth ||
//         cookies.user_auth ||
//         cookies.token ||
//         cookies.session ||
//         null;
//     }

//     if (!token) {
//       console.warn("❌ No token found in request");
//       return null;
//     }

//     // ✅ 3. Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     if (!decoded?.id) {
//       console.warn("❌ Invalid JWT payload");
//       return null;
//     }

//     // ✅ 4. Fetch user and return (without password)
//     const user = await User.findById(decoded.id).select("-password");
//     if (!user) {
//       console.warn("❌ User not found for token id:", decoded.id);
//       return null;
//     }

//     return user;
//   } catch (err) {
//     console.error("❌ getUserFromToken error:", err.message);
//     return null;
//   }
// }
















// import jwt from "jsonwebtoken";
// import dbConnect from "@/lib/dbConnect";
// import Admin from "@/models/Admin";

// export default async function getUserFromToken(req) {
//   await dbConnect();

//   try {
//     const raw = req.cookies?.admin_auth;
//     if (!raw) {
//       console.error("❌ No admin_auth cookie found");
//       return null;
//     }

//     // ✅ Decode URL-safe cookie
//     const token = decodeURIComponent(raw);

//     // ✅ Verify with your JWT_SECRET
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     if (!decoded?.id) {
//       console.error("❌ Invalid token payload");
//       return null;
//     }

//     const admin = await Admin.findById(decoded.id);
//     if (!admin) {
//       console.error("❌ User not found for token id:", decoded.id);
//       return null;
//     }

//     return admin;
//   } catch (err) {
//     console.error("JWT verification failed:", err.message);
//     return null;
//   }
// }
