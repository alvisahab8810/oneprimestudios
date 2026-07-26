export function hasPermission(user, permissionKey) {
  // 🟢 Admin / super_admin has full access
  if (user.role === "admin" || user.role === "super_admin") return true;

  // 🟢 Explicit permission (checkbox-based)
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.includes(permissionKey);
  }

  // 🟡 Role-based fallback (SAFE DEFAULTS)
  const ROLE_DEFAULTS = {
    manager:         ["dashboard", "orders", "partners"],
    designer:        ["dashboard", "orders"],
    product_manager: ["dashboard", "products", "orders"],
    finance:         ["dashboard", "invoices"],
  };

  const defaults = ROLE_DEFAULTS[user.role] || [];
  return defaults.includes(permissionKey);
}

// 🔐 Payment details: only admin/super_admin OR explicit "payments.view" permission
// OPS roles (designer, product_manager, manager) cannot see payment info by default.
export function canViewPayments(user) {
  if (!user) return false;
  if (user.role === "admin" || user.role === "super_admin") return true;
  return Array.isArray(user.permissions) && user.permissions.includes("payments.view");
}
