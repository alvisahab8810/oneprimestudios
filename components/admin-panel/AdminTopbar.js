"use client";
// components/admin-panel/AdminTopbar.js
// Shared top bar for every dashboard page: shows who is signed in and logs them out.
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";
import { FaBell, FaUserCircle } from "react-icons/fa";

// Role keys saved on the admin record, shown in a readable form
const ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  designer: "Designer",
  product_manager: "Product Manager",
  accountant: "Accountant",
  support: "Support",
};

export default function AdminTopbar({
  onToggleSidebar,
  navClassName = "navbar navbar-expand-lg navbar-light bg-light px-4 shadow-sm",
  toggleIcon = "☰",
  showBell = true,
}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const res = await fetch("/api/admin/me", { credentials: "include" });
        const data = await res.json();
        if (!cancelled && res.ok) setUser(data);
      } catch {
        // The sidebar already redirects on an expired session, so stay quiet here
      }
    };

    loadUser();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const res = await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
      toast.success("Logged out");
      router.replace("/dashboard/admin/login");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Could not log out. Please try again.");
      setLoggingOut(false);
    }
  };

  const displayName = user?.name || user?.email || "Account";
  const roleLabel = user?.role ? ROLE_LABELS[user.role] || user.role : "";

  return (
    <nav className={navClassName}>
      {onToggleSidebar && (
        <button className="btn btn-outline-primary me-3" onClick={onToggleSidebar}>{toggleIcon}</button>
      )}

      <div className="ms-auto d-flex align-items-center">
        {showBell && <FaBell className="me-3" size={20} />}

        <div className="dropdown">
          <button
            className="btn btn-secondary dropdown-toggle d-flex align-items-center gap-2"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <FaUserCircle size={18} />
            <span className="text-start lh-sm">
              {displayName}
              {roleLabel && (
                <span className="d-block" style={{ fontSize: 11, opacity: 0.8 }}>{roleLabel}</span>
              )}
            </span>
          </button>

          <ul className="dropdown-menu dropdown-menu-end">
            {user?.email && (
              <li>
                <span className="dropdown-item-text small text-muted">{user.email}</span>
              </li>
            )}
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button
                className="dropdown-item text-danger"
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
