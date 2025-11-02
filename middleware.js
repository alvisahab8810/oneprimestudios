// import { NextResponse } from "next/server";

// // ✅ Helper: Verify JWT manually (Edge-safe)
// async function verifyJWT(token, secret) {
//   try {
//     const encoder = new TextEncoder();
//     const key = await crypto.subtle.importKey(
//       "raw",
//       encoder.encode(secret),
//       { name: "HMAC", hash: "SHA-256" },
//       false,
//       ["verify"]
//     );

//     const [headerB64, payloadB64, signatureB64] = token.split(".");
//     const data = `${headerB64}.${payloadB64}`;
//     const signature = Uint8Array.from(atob(signatureB64), (c) =>
//       c.charCodeAt(0)
//     );

//     const valid = await crypto.subtle.verify(
//       "HMAC",
//       key,
//       signature,
//       new TextEncoder().encode(data)
//     );

//     if (!valid) throw new Error("Invalid signature");

//     // Decode and return payload
//     const payload = JSON.parse(atob(payloadB64));
//     if (payload.exp * 1000 < Date.now()) throw new Error("Token expired");

//     return payload;
//   } catch (err) {
//     console.error("JWT verification failed:", err.message);
//     return null;
//   }
// }

// export async function middleware(req) {
//   const { pathname } = req.nextUrl;
//   const token = req.cookies.get("admin_auth")?.value;

//   // ✅ Allow public and login routes
//   if (
//     pathname.startsWith("/api") ||
//     pathname.startsWith("/_next") ||
//     pathname === "/favicon.ico" ||
//     pathname.startsWith("/public")
//   ) {
//     return NextResponse.next();
//   }

//   // ✅ If visiting login page
//   if (pathname === "/dashboard/admin/login") {
//     if (token) {
//       const valid = await verifyJWT(token, process.env.JWT_SECRET);
//       if (valid) {
//         return NextResponse.redirect(new URL("/dashboard/admin", req.url));
//       }
//     }
//     return NextResponse.next();
//   }

//   // ✅ Protect admin dashboard
//   if (pathname.startsWith("/dashboard/admin")) {
//     if (!token) {
//       return NextResponse.redirect(new URL("/dashboard/admin/login", req.url));
//     }

//     const valid = await verifyJWT(token, process.env.JWT_SECRET);
//     if (!valid) {
//       return NextResponse.redirect(new URL("/dashboard/admin/login", req.url));
//     }

//     return NextResponse.next();
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/dashboard/admin/:path*"],
// };





import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/verifyJWT";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const token = req.cookies.get("admin_auth")?.value;

  // ✅ Public routes (no protection)
  if (
    url.pathname.startsWith("/dashboard/admin/login") ||
    url.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // ✅ Protected routes
  if (url.pathname.startsWith("/dashboard")) {
    if (!token) {
      url.pathname = "/dashboard/admin/login";
      return NextResponse.redirect(url);
    }

    const decoded = verifyJWT(token);
    if (!decoded || decoded.role !== "admin") {
      url.pathname = "/dashboard/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
