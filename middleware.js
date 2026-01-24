



// import { NextResponse } from "next/server";
// import { verifyJWT } from "@/lib/verifyJWT";

// export function middleware(req) {
//   const url = req.nextUrl.clone();
//   const token = req.cookies.get("admin_auth")?.value;

//   // ✅ Public routes (no protection)
//   if (
//     url.pathname.startsWith("/dashboard/admin/login") ||
//     url.pathname.startsWith("/api")
//   ) {
//     return NextResponse.next();
//   }

//   // ✅ Protected routes
//   if (url.pathname.startsWith("/dashboard")) {
//     if (!token) {
//       url.pathname = "/dashboard/admin/login";
//       return NextResponse.redirect(url);
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded || decoded.role !== "admin") {
//       url.pathname = "/dashboard/admin/login";
//       return NextResponse.redirect(url);
//     }
//   }

//   return NextResponse.next();
// }




import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/verifyJWT";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const token = req.cookies.get("admin_auth")?.value;

  // ✅ Public routes
  if (
    url.pathname.startsWith("/dashboard/admin/login") ||
    url.pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  // ✅ Protected dashboard routes
  if (url.pathname.startsWith("/dashboard")) {
    if (!token) {
      url.pathname = "/dashboard/admin/login";
      return NextResponse.redirect(url);
    }

    const decoded = verifyJWT(token);

    const ALLOWED_ROLES = [
      "admin",
      "manager",
      "designer",
      "product_manager",
    ];

    if (!decoded || !ALLOWED_ROLES.includes(decoded.role)) {
      url.pathname = "/dashboard/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
