export function canAccess(user, permissionKey) {
  if (!user) return false;

  // Admin always sees everything
  if (user.role === "admin") return true;

  // Checkbox-based permission
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions.includes(permissionKey);
  }

  // Role fallback (same as backend)
  const ROLE_DEFAULTS = {
    manager: ["dashboard", "partners"],
    designer: ["dashboard"],
    product_manager: ["dashboard", "products"],
    finance: ["dashboard", "invoices"],
  };

  const defaults = ROLE_DEFAULTS[user.role] || [];
  return defaults.includes(permissionKey);
}
