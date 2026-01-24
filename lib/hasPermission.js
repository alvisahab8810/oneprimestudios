export function hasPermission(user, permissionKey) {
  // 🟢 Admin has full access
  if (user.role === "admin") return true;

  // 🟢 Explicit permission (checkbox-based)
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.includes(permissionKey);
  }

  // 🟡 Role-based fallback (SAFE DEFAULTS)
  const ROLE_DEFAULTS = {
    manager: ["dashboard", "partners"],
    designer: ["dashboard"],
    product_manager: ["dashboard", "products"],
  };

  const defaults = ROLE_DEFAULTS[user.role] || [];
  return defaults.includes(permissionKey);
}
