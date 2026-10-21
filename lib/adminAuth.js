// lib/adminAuth.js — server-only guard for admin API routes.
// Reads the admin_auth cookie, loads the admin and checks one permission key.
// Returns the admin user, or sends 401/403 and returns null.
// The token signature is checked here (lib/verifyJWT only decodes it).
import jwt from "jsonwebtoken";
import Admin from "@/models/Admin";
import { hasPermission } from "@/lib/hasPermission";

function decodeVerified(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export async function requireAdminPermission(req, res, permissionKey) {
  const token = req.cookies?.admin_auth;
  const decoded = token ? decodeVerified(token) : null;
  if (!decoded?.id) {
    res.status(401).json({ message: "Admin access only" });
    return null;
  }

  const admin = await Admin.findById(decoded.id, { role: 1, permissions: 1 }).lean();
  if (!admin) {
    res.status(401).json({ message: "Admin access only" });
    return null;
  }

  const user = { id: admin._id, role: admin.role, permissions: admin.permissions || [] };
  if (permissionKey && !hasPermission(user, permissionKey)) {
    res.status(403).json({ message: "You do not have permission for this action" });
    return null;
  }
  return user;
}

// Super-admin-only guard, for screens that manage the OPS staff accounts
// themselves (create/delete users, read their login history). Unlike
// requireAdminPermission this cannot be granted with a permission checkbox.
export async function requireSuperAdmin(req, res) {
  const token = req.cookies?.admin_auth;
  const decoded = token ? decodeVerified(token) : null;
  if (!decoded?.id) {
    res.status(401).json({ message: "Admin access only" });
    return null;
  }

  const admin = await Admin.findById(decoded.id, { role: 1, name: 1, email: 1 }).lean();
  if (!admin) {
    res.status(401).json({ message: "Admin access only" });
    return null;
  }
  if (admin.role !== "super_admin" && admin.role !== "admin") {
    res.status(403).json({ message: "Super admin access only" });
    return null;
  }

  return { id: admin._id, role: admin.role, name: admin.name, email: admin.email };
}
