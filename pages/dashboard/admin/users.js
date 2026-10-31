// "use client";
// import { useEffect, useState } from "react";
// import toast from "react-hot-toast";
// import { PERMISSIONS } from "@/config/permissions";

// import Sidebar from "@/components/admin-panel/Sidebar";

// export default function AdminUsersPage() {
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchUsers = async () => {
//       try {
//         const res = await fetch("/api/admin/users", {
//           credentials: "include",
//         });

//         const data = await res.json();

//         if (!res.ok) {
//           throw new Error(data.message || "Failed to load users");
//         }

//         setUsers(data.users);
//       } catch (err) {
//         toast.error(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUsers();
//   }, []);

//   const togglePermission = async (userId, permissionKey) => {
//     try {
//       const user = users.find((u) => u._id === userId);
//       const updatedPermissions = user.permissions?.includes(permissionKey)
//         ? user.permissions.filter((p) => p !== permissionKey)
//         : [...(user.permissions || []), permissionKey];

//       const res = await fetch("/api/admin/users/update-permissions", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify({
//           userId,
//           permissions: updatedPermissions,
//         }),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       setUsers((prev) =>
//         prev.map((u) =>
//           u._id === userId ? { ...u, permissions: updatedPermissions } : u,
//         ),
//       );
//     } catch (err) {
//       toast.error(err.message || "Failed to update permission");
//     }
//   };

//   return (
//     <div className="admin-dashboard-v2 d-flex">
//       <Sidebar sidebarOpen={true} />

//       <div className="main-area">
//         <div className="main-area-pad">
//           <h2 className="mb-4">OPS Users</h2>

//           {loading ? (
//             <p>Loading users...</p>
//           ) : (
//             <div className="table-responsive">
//               <table className="table table-bordered">
//                 <thead className="table-light">
//                   <tr>
//                     <th>Name</th>
//                     <th>Email</th>
//                     <th>Role</th>
//                     <th>Status</th>
//                     <th>Permissions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {users.length === 0 ? (
//                     <tr>
//                       <td colSpan="4" className="text-center">
//                         No users found
//                       </td>
//                     </tr>
//                   ) : (
//                     users.map((user) => (
//                       <tr key={user._id}>
//                         <td>{user.name}</td>
//                         <td>{user.email}</td>
//                         <td className="text-capitalize">
//                           {user.role.replace("_", " ")}
//                         </td>
//                         <td>
//                           {user.isActive ? (
//                             <span className="badge bg-success">Active</span>
//                           ) : (
//                             <span className="badge bg-warning text-dark">
//                               Pending
//                             </span>
//                           )}
//                         </td>

//                         <td>
//                           {PERMISSIONS.map((perm) => (
//                             <label
//                               key={perm.key}
//                               className="me-3 d-inline-block"
//                             >
//                               <input
//                                 type="checkbox"
//                                 checked={user.permissions?.includes(perm.key)}
//                                 onChange={() =>
//                                   togglePermission(user._id, perm.key)
//                                 }
//                               />
//                               <span className="ms-1">{perm.label}</span>
//                             </label>
//                           ))}
//                         </td>
//                       </tr>
//                     ))
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }



"use client";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import * as XLSX from "xlsx";

import Sidebar from "@/components/admin-panel/Sidebar";
import { PERMISSIONS } from "@/config/permissions";

// Login times are stored in UTC; staff read them in IST
function formatLoginTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

// The sheet keeps date and time in separate columns so either one can be
// sorted, filtered or grouped in Excel without touching the other
function istParts(value) {
  if (!value) return { date: "", time: "", day: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "", time: "", day: "" };
  const opts = { timeZone: "Asia/Kolkata" };
  return {
    date: d.toLocaleDateString("en-GB", { ...opts, day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { ...opts, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
    day: d.toLocaleDateString("en-IN", { ...opts, weekday: "long" }),
  };
}

const roleLabel = (role) => String(role || "").replace(/_/g, " ");

const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

// A super admin's own account, and any other super admin, is managed from the
// database rather than from this screen — nobody can lock themselves out here.
function isLocked(user, meId) {
  if (String(user._id) === String(meId)) return true;
  return user.role === "admin" || user.role === "super_admin";
}

function statusOf(user) {
  if (user.isActive) return { label: "Active", tone: "ok" };
  if (user.hasPassword) return { label: "Suspended", tone: "bad" };
  if (user.invitePending) return { label: "Invite sent", tone: "warn" };
  return { label: "Invite expired", tone: "muted" };
}

export default function AdminUsersPage() {
  const [sidebarOpen] = useState(true);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  // The window the Excel export covers; blank means everything kept (180 days)
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const limit = 10;
  const [hasMore, setHasMore] = useState(false);

  // The signed-in super admin, so their own row cannot be edited away
  const [meId, setMeId] = useState("");

  // Row-level work in progress, keyed by user id
  const [busyId, setBusyId] = useState("");

  // The invite / reset link, shown so it can be shared even if email fails
  const [linkInfo, setLinkInfo] = useState(null);

  // Permissions are edited in their own dialog; the table only summarises them
  const [permUser, setPermUser] = useState(null);

  // Login history, opened for one staff account at a time
  const [historyUser, setHistoryUser] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* ================= FETCH USERS ================= */
  const fetchUsers = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        search,
        role,
        page,
        limit,
      });

      const res = await fetch(`/api/admin/users?${params}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setUsers(data.users);
      setHasMore(data.hasMore);
      setMeId(data.me?.id || "");
    } catch (err) {
      toast.error(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, role, page]);

  // Counts for the strip above the table, over the page being shown
  const counts = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const awaiting = users.filter((u) => !u.isActive && !u.hasPassword).length;
    return { total: users.length, active, awaiting, suspended: users.length - active - awaiting };
  }, [users]);

  /* ================= TOGGLE PERMISSION ================= */
  const togglePermission = async (userId, permissionKey) => {
    try {
      const user = users.find((u) => u._id === userId);
      const updatedPermissions = user.permissions?.includes(permissionKey)
        ? user.permissions.filter((p) => p !== permissionKey)
        : [...(user.permissions || []), permissionKey];

      const res = await fetch("/api/admin/users/update-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          permissions: updatedPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, permissions: updatedPermissions } : u
        )
      );
      setPermUser((prev) =>
        prev && prev._id === userId ? { ...prev, permissions: updatedPermissions } : prev
      );
    } catch (err) {
      toast.error(err.message || "Failed to update permission");
    }
  };

  /* ================= EXCEL EXPORT ================= */
  const exportExcel = async () => {
    try {
      setExporting(true);

      const params = new URLSearchParams({ search, role, from, to });
      const res = await fetch(`/api/admin/users/login-report?${params}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      const events = data.events || [];
      const staff = data.users || [];

      // Sheet 1 — one row per sign-in or sign-out, which is what the date and
      // time columns are really for
      const loginRows = events.map((e) => {
        const { date, time, day } = istParts(e.at);
        return {
          Date: date,
          Time: time,
          Day: day,
          Name: e.name,
          Email: e.email,
          Role: roleLabel(e.role),
          Event: e.type === "logout" ? "Logout" : "Login",
          "IP address": e.ip || "",
          Device: e.userAgent || "",
        };
      });

      // Sheet 2 — where each account stands right now
      const summaryRows = staff.map((u) => {
        const last = istParts(u.lastLoginAt);
        const logins = events.filter((e) => e.email === u.email && e.type === "login");
        return {
          Name: u.name,
          Email: u.email,
          Role: roleLabel(u.role),
          Status: u.isActive ? "Active" : "Inactive",
          "Last login date": last.date,
          "Last login time": last.time,
          "Total logins": u.loginCount || 0,
          "Logins in this report": logins.length,
          Permissions: (u.permissions || [])
            .map((key) => PERMISSIONS.find((p) => p.key === key)?.label || key)
            .join(", "),
        };
      });

      // Sheet 3 — logins per person per day, the view a month-end check needs
      const perDay = new Map();
      for (const e of events) {
        if (e.type !== "login") continue;
        const { date, day } = istParts(e.at);
        const key = `${date}|${e.email}`;
        const row = perDay.get(key) || {
          Date: date,
          Day: day,
          Name: e.name,
          Email: e.email,
          Logins: 0,
          "First login": "",
          "Last login": "",
        };
        row.Logins += 1;
        // Events arrive newest first, so the first one seen for a day is the
        // last login of that day
        const t = istParts(e.at).time;
        if (!row["Last login"]) row["Last login"] = t;
        row["First login"] = t;
        perDay.set(key, row);
      }

      const book = XLSX.utils.book_new();

      const sheet1 = XLSX.utils.json_to_sheet(
        loginRows.length ? loginRows : [{ Date: "", Time: "", Day: "", Name: "No sign-ins in this period" }]
      );
      sheet1["!cols"] = [
        { wch: 14 }, { wch: 12 }, { wch: 11 }, { wch: 22 },
        { wch: 28 }, { wch: 16 }, { wch: 9 }, { wch: 16 }, { wch: 60 },
      ];
      XLSX.utils.book_append_sheet(book, sheet1, "Login History");

      const sheet2 = XLSX.utils.json_to_sheet(summaryRows);
      sheet2["!cols"] = [
        { wch: 22 }, { wch: 28 }, { wch: 16 }, { wch: 11 },
        { wch: 15 }, { wch: 13 }, { wch: 12 }, { wch: 20 }, { wch: 60 },
      ];
      XLSX.utils.book_append_sheet(book, sheet2, "Users");

      const sheet3 = XLSX.utils.json_to_sheet(
        perDay.size ? Array.from(perDay.values()) : [{ Date: "", Name: "No sign-ins in this period" }]
      );
      sheet3["!cols"] = [
        { wch: 14 }, { wch: 11 }, { wch: 22 }, { wch: 28 },
        { wch: 8 }, { wch: 13 }, { wch: 13 },
      ];
      XLSX.utils.book_append_sheet(book, sheet3, "Daily Logins");

      const stamp = new Date().toISOString().slice(0, 10);
      const period = from || to ? `_${from || "start"}_to_${to || "today"}` : "";
      XLSX.writeFile(book, `ops-users-logins${period}_${stamp}.xlsx`);

      toast.success(`Exported ${loginRows.length} sign-in records`);
    } catch (err) {
      toast.error(err.message || "Could not export the report");
    } finally {
      setExporting(false);
    }
  };

  /* ================= INVITE / PASSWORD ACCESS ================= */
  const sendAccessLink = async (user, mode) => {
    const label = mode === "reset" ? "reset password for" : "send a new invite to";
    if (!confirm(`Are you sure you want to ${label} ${user.name}?`)) return;

    try {
      setBusyId(user._id);

      const res = await fetch(`/api/admin/users/${user._id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (data.emailSent) toast.success(data.message);
      else toast(data.message, { icon: "⚠️" });

      setLinkInfo({
        name: user.name,
        email: user.email,
        mode: data.mode,
        link: data.link,
        emailSent: data.emailSent,
        expiresAt: data.expiresAt,
      });

      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Could not send the link");
    } finally {
      setBusyId("");
    }
  };

  const copyLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  /* ================= ACCESS + ROLE ================= */
  const updateUser = async (user, patch, confirmText) => {
    if (confirmText && !confirm(confirmText)) {
      fetchUsers(); // put a changed dropdown back where it was
      return;
    }

    try {
      setBusyId(user._id);

      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(data.message || "Updated");
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Could not update this user");
      fetchUsers();
    } finally {
      setBusyId("");
    }
  };

  /* ================= LOGIN HISTORY ================= */
  const openHistory = async (user) => {
    setHistoryUser(user);
    setHistoryRows([]);
    setHistoryLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${user._id}/logins`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setHistoryRows(data.logins || []);
    } catch (err) {
      toast.error(err.message || "Failed to load login history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistory = () => {
    setHistoryUser(null);
    setHistoryRows([]);
  };

  const deleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success("User deleted");
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  return (
    <div className="admin-dashboard-v2 d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="main-area-pad ops-users">

          {/* HEADER */}
          <div className="ops-head">
            <div>
              <h2 className="dashboard-main-h mb-1">OPS Users</h2>
              <p className="ops-sub mb-0">
                Staff accounts, what each one can reach, and when they last signed in.
              </p>
            </div>

            <div className="ops-head-actions">
              <button
                type="button"
                className="ops-btn ops-btn-ghost"
                onClick={exportExcel}
                disabled={exporting}
              >
                {exporting ? "Preparing..." : "Export Excel"}
              </button>
              <Link href="/dashboard/admin/create-user" className="ops-btn ops-btn-dark">
                + Create User
              </Link>
            </div>
          </div>

          {/* COUNTS */}
          <div className="ops-stats">
            <div className="ops-stat">
              <span className="ops-stat-n">{counts.total}</span>
              <span className="ops-stat-l">On this page</span>
            </div>
            <div className="ops-stat">
              <span className="ops-stat-n">{counts.active}</span>
              <span className="ops-stat-l">Active</span>
            </div>
            <div className="ops-stat">
              <span className="ops-stat-n">{counts.awaiting}</span>
              <span className="ops-stat-l">Awaiting first sign-in</span>
            </div>
            <div className="ops-stat">
              <span className="ops-stat-n">{counts.suspended}</span>
              <span className="ops-stat-l">Suspended</span>
            </div>
          </div>

          {/* FILTERS */}
          <div className="ops-toolbar">
            <input
              className="ops-input ops-search"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />

            <select
              className="ops-input"
              value={role}
              onChange={(e) => {
                setPage(1);
                setRole(e.target.value);
              }}
            >
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="designer">Designer</option>
              <option value="product_manager">Product Manager</option>
              <option value="finance">Finance</option>
            </select>

            {/* These two only shape the Excel export, not the table */}
            <div className="ops-range">
              <span className="ops-range-l">Export period</span>
              <input
                type="date"
                className="ops-input ops-date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="ops-range-dash">to</span>
              <input
                type="date"
                className="ops-input ops-date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="ops-card">
            {loading ? (
              <div className="ops-empty">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="ops-empty">No users found</div>
            ) : (
              <div className="table-responsive">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Last login</th>
                      <th>Permissions</th>
                      <th className="ops-th-right">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {users.map((user) => {
                      const locked = isLocked(user, meId);
                      const status = statusOf(user);
                      const perms = user.permissions || [];
                      const named = perms
                        .map((key) => PERMISSIONS.find((p) => p.key === key)?.label)
                        .filter(Boolean);

                      return (
                        <tr key={user._id}>
                          <td>
                            <div className="ops-user">
                              <span className="ops-avatar">{initials(user.name)}</span>
                              <span className="ops-user-text">
                                <span className="ops-user-name">{user.name}</span>
                                <span className="ops-user-mail">{user.email}</span>
                              </span>
                            </div>
                          </td>

                          <td>
                            {locked ? (
                              <span className="ops-role-fixed">{roleLabel(user.role)}</span>
                            ) : (
                              <select
                                className="ops-input ops-role"
                                value={user.role}
                                disabled={busyId === user._id}
                                onChange={(e) =>
                                  updateUser(
                                    user,
                                    { role: e.target.value },
                                    `Change ${user.name}'s role to "${roleLabel(e.target.value)}"?`
                                  )
                                }
                              >
                                <option value="manager">Manager</option>
                                <option value="designer">Designer</option>
                                <option value="product_manager">Product Manager</option>
                                <option value="finance">Finance</option>
                              </select>
                            )}
                          </td>

                          <td>
                            <span className={`ops-pill ops-pill-${status.tone}`}>{status.label}</span>
                            {!user.isActive && !user.hasPassword && user.inviteExpiresAt && (
                              <div className="ops-note">
                                {user.invitePending ? "Expires " : "Expired "}
                                {formatLoginTime(user.inviteExpiresAt)}
                              </div>
                            )}
                          </td>

                          <td>
                            {user.lastLoginAt ? (
                              <>
                                <div className="ops-when">{formatLoginTime(user.lastLoginAt)}</div>
                                <div className="ops-note">
                                  {user.loginCount || 0} login
                                  {(user.loginCount || 0) === 1 ? "" : "s"}
                                </div>
                              </>
                            ) : (
                              <div className="ops-note">Never logged in</div>
                            )}

                            <button
                              type="button"
                              className="ops-link"
                              onClick={() => openHistory(user)}
                            >
                              View history
                            </button>
                          </td>

                          <td>
                            {perms.length === 0 ? (
                              <span className="ops-note">No access granted</span>
                            ) : (
                              <div className="ops-perms">
                                {named.slice(0, 3).map((label) => (
                                  <span key={label} className="ops-chip">
                                    {label}
                                  </span>
                                ))}
                                {named.length > 3 && (
                                  <span className="ops-chip ops-chip-more">
                                    +{named.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}

                            <button
                              type="button"
                              className="ops-link"
                              onClick={() => setPermUser(user)}
                            >
                              Manage ({perms.length}/{PERMISSIONS.length})
                            </button>
                          </td>

                          <td className="ops-td-right">
                            {locked ? (
                              <span className="ops-note">
                                {String(user._id) === String(meId) ? "This is you" : "Super admin"}
                              </span>
                            ) : (
                              <div className="ops-actions">
                                <button
                                  type="button"
                                  className="ops-btn ops-btn-sm ops-btn-ghost"
                                  disabled={busyId === user._id}
                                  onClick={() =>
                                    sendAccessLink(user, user.hasPassword ? "reset" : "invite")
                                  }
                                >
                                  {user.hasPassword
                                    ? "Reset password"
                                    : user.invitePending
                                      ? "Resend invite"
                                      : "Send invite"}
                                </button>

                                {user.hasPassword && (
                                  <button
                                    type="button"
                                    className="ops-btn ops-btn-sm ops-btn-ghost"
                                    disabled={busyId === user._id}
                                    onClick={() =>
                                      updateUser(
                                        user,
                                        { isActive: !user.isActive },
                                        user.isActive
                                          ? `Suspend ${user.name}? They will not be able to sign in.`
                                          : `Restore access for ${user.name}?`
                                      )
                                    }
                                  >
                                    {user.isActive ? "Suspend" : "Restore access"}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  className="ops-btn ops-btn-sm ops-btn-danger"
                                  disabled={busyId === user._id}
                                  onClick={() => deleteUser(user._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PAGINATION */}
          <div className="ops-pager">
            <button
              type="button"
              className="ops-btn ops-btn-ghost"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="ops-page-n">Page {page}</span>
            <button
              type="button"
              className="ops-btn ops-btn-ghost"
              disabled={!hasMore}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>

          {/* PERMISSIONS */}
          {permUser && (
            <div className="modal d-block ops-modal" onClick={() => setPermUser(null)}>
              <div
                className="modal-dialog modal-lg modal-dialog-centered"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-content">
                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title mb-0">Permissions</h5>
                      <small className="text-muted">
                        {permUser.name} · {permUser.email}
                      </small>
                    </div>
                    <button type="button" className="btn-close" onClick={() => setPermUser(null)} />
                  </div>

                  <div className="modal-body">
                    <p className="ops-note mb-3">
                      Changes save as soon as you tick a box.
                    </p>
                    <div className="ops-perm-grid">
                      {PERMISSIONS.map((perm) => {
                        const on = permUser.permissions?.includes(perm.key);
                        return (
                          <button
                            key={perm.key}
                            type="button"
                            className={`ops-perm${on ? " ops-perm-on" : ""}`}
                            aria-pressed={on}
                            onClick={() => togglePermission(permUser._id, perm.key)}
                          >
                            <span className="ops-perm-box">{on ? "✓" : ""}</span>
                            {perm.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button className="ops-btn ops-btn-dark" onClick={() => setPermUser(null)}>
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INVITE / RESET LINK */}
          {linkInfo && (
            <div className="modal d-block ops-modal" onClick={() => setLinkInfo(null)}>
              <div
                className="modal-dialog modal-dialog-centered"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-content">
                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title mb-0">
                        {linkInfo.mode === "reset" ? "Password reset link" : "Invite link"}
                      </h5>
                      <small className="text-muted">
                        {linkInfo.name} · {linkInfo.email}
                      </small>
                    </div>
                    <button type="button" className="btn-close" onClick={() => setLinkInfo(null)} />
                  </div>

                  <div className="modal-body">
                    {linkInfo.emailSent ? (
                      <p className="text-success" style={{ fontSize: 13 }}>
                        The link has been emailed. You can also share it directly:
                      </p>
                    ) : (
                      <p className="text-danger" style={{ fontSize: 13 }}>
                        The email could not be sent. Share this link with the user yourself:
                      </p>
                    )}

                    <div className="input-group">
                      <input className="form-control" readOnly value={linkInfo.link} />
                      <button className="btn btn-dark" onClick={() => copyLink(linkInfo.link)}>
                        Copy
                      </button>
                    </div>

                    {linkInfo.expiresAt && (
                      <p className="text-muted mt-2 mb-0" style={{ fontSize: 12 }}>
                        Valid until {formatLoginTime(linkInfo.expiresAt)}. Any earlier link for this
                        user has stopped working.
                      </p>
                    )}
                  </div>

                  <div className="modal-footer">
                    <button className="ops-btn ops-btn-ghost" onClick={() => setLinkInfo(null)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LOGIN HISTORY */}
          {historyUser && (
            <div className="modal d-block ops-modal" onClick={closeHistory}>
              <div
                className="modal-dialog modal-lg modal-dialog-centered"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-content">
                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title mb-0">Login history</h5>
                      <small className="text-muted">
                        {historyUser.name} · {historyUser.email}
                      </small>
                    </div>
                    <button type="button" className="btn-close" onClick={closeHistory} />
                  </div>

                  <div className="modal-body">
                    {historyLoading ? (
                      <p className="mb-0">Loading login history...</p>
                    ) : historyRows.length === 0 ? (
                      <p className="mb-0 text-muted">
                        No sign-ins recorded yet. History is kept for the last 180 days.
                      </p>
                    ) : (
                      <div className="table-responsive">
                        <table className="ops-table ops-table-sm">
                          <thead>
                            <tr>
                              <th>Event</th>
                              <th>Date &amp; time</th>
                              <th>IP address</th>
                              <th>Device</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyRows.map((row) => (
                              <tr key={row._id}>
                                <td>
                                  <span
                                    className={
                                      row.type === "logout"
                                        ? "ops-pill ops-pill-muted"
                                        : "ops-pill ops-pill-ok"
                                    }
                                  >
                                    {row.type === "logout" ? "Logout" : "Login"}
                                  </span>
                                </td>
                                <td style={{ whiteSpace: "nowrap" }}>{formatLoginTime(row.at)}</td>
                                <td>{row.ip || "-"}</td>
                                <td style={{ fontSize: 12, wordBreak: "break-word" }}>
                                  {row.userAgent || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="modal-footer">
                    <button className="ops-btn ops-btn-ghost" onClick={closeHistory}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <style jsx>{`
            .ops-head {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              flex-wrap: wrap;
              margin-bottom: 18px;
            }
            .ops-sub {
              color: #6b7280;
              font-size: 13px;
            }
            .ops-head-actions {
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
            }

            .ops-btn {
              border-radius: 8px;
              border: 1px solid #e5e7eb;
              background: #fff;
              color: #111111;
              font-size: 13.5px;
              font-weight: 600;
              padding: 9px 16px;
              line-height: 1.2;
              text-decoration: none;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              transition: background 0.15s, border-color 0.15s, color 0.15s;
            }
            .ops-btn:disabled {
              opacity: 0.55;
              cursor: not-allowed;
            }
            .ops-btn-ghost:hover:not(:disabled) {
              background: #f6f7f9;
              border-color: #d1d5db;
            }
            .ops-btn-dark {
              background: #111111;
              border-color: #111111;
              color: #fff;
            }
            .ops-btn-dark:hover {
              background: #000;
              color: #fff;
            }
            .ops-btn-danger {
              border-color: #f3c6c4;
              color: #e10600;
            }
            .ops-btn-danger:hover:not(:disabled) {
              background: #fdeaea;
              border-color: #e10600;
            }
            .ops-btn-sm {
              padding: 6px 11px;
              font-size: 12.5px;
              font-weight: 500;
            }

            .ops-stats {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 10px;
              margin-bottom: 16px;
            }
            .ops-stat {
              background: #fff;
              border: 1px solid #edeff2;
              border-radius: 10px;
              padding: 12px 14px;
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .ops-stat-n {
              font-size: 20px;
              font-weight: 700;
              color: #111111;
              font-variant-numeric: tabular-nums;
            }
            .ops-stat-l {
              font-size: 11.5px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }

            .ops-toolbar {
              display: flex;
              gap: 10px;
              flex-wrap: wrap;
              align-items: center;
              margin-bottom: 14px;
            }
            .ops-input {
              border: 1px solid #e3e6ea;
              border-radius: 8px;
              padding: 9px 12px;
              font-size: 13.5px;
              color: #111111;
              background: #fff;
              outline: none;
            }
            .ops-input:focus {
              border-color: #111111;
            }
            .ops-search {
              flex: 1 1 260px;
              max-width: 360px;
            }
            .ops-range {
              display: flex;
              align-items: center;
              gap: 7px;
              margin-left: auto;
            }
            .ops-range-l,
            .ops-range-dash {
              font-size: 12px;
              color: #6b7280;
              white-space: nowrap;
            }
            .ops-date {
              padding: 8px 10px;
              font-size: 12.5px;
            }

            .ops-card {
              background: #fff;
              border: 1px solid #edeff2;
              border-radius: 12px;
              overflow: hidden;
            }
            .ops-empty {
              padding: 42px 20px;
              text-align: center;
              color: #6b7280;
              font-size: 14px;
            }

            .ops-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13.5px;
            }
            .ops-table th {
              background: #fafbfc;
              text-align: left;
              font-size: 11.5px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.045em;
              color: #6b7280;
              padding: 12px 14px;
              border-bottom: 1px solid #edeff2;
              white-space: nowrap;
            }
            .ops-table td {
              padding: 14px;
              border-bottom: 1px solid #f2f4f6;
              vertical-align: top;
              color: #111111;
            }
            .ops-table tbody tr:last-child td {
              border-bottom: 0;
            }
            .ops-table tbody tr:hover td {
              background: #fcfcfd;
            }
            .ops-th-right,
            .ops-td-right {
              text-align: right;
            }
            .ops-table-sm td,
            .ops-table-sm th {
              padding: 9px 11px;
            }

            .ops-user {
              display: flex;
              gap: 10px;
              align-items: center;
              min-width: 190px;
            }
            .ops-avatar {
              width: 34px;
              height: 34px;
              border-radius: 50%;
              background: #111111;
              color: #fff;
              font-size: 12px;
              font-weight: 700;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              flex: none;
            }
            .ops-user-text {
              display: flex;
              flex-direction: column;
              min-width: 0;
            }
            .ops-user-name {
              font-weight: 600;
            }
            .ops-user-mail {
              font-size: 12px;
              color: #6b7280;
              word-break: break-all;
            }

            .ops-role {
              padding: 6px 10px;
              font-size: 12.5px;
              min-width: 140px;
            }
            .ops-role-fixed {
              text-transform: capitalize;
              font-weight: 600;
              font-size: 13px;
            }

            .ops-pill {
              display: inline-block;
              padding: 3px 10px;
              border-radius: 999px;
              font-size: 11.5px;
              font-weight: 600;
              white-space: nowrap;
            }
            .ops-pill-ok {
              background: #e8f6ee;
              color: #136c36;
            }
            .ops-pill-bad {
              background: #fdeaea;
              color: #b00500;
            }
            .ops-pill-warn {
              background: #fff4e0;
              color: #92610a;
            }
            .ops-pill-muted {
              background: #f1f2f4;
              color: #5b6069;
            }

            .ops-note {
              font-size: 11.5px;
              color: #6b7280;
              margin-top: 4px;
            }
            .ops-when {
              font-size: 12.5px;
              white-space: nowrap;
            }

            .ops-link {
              background: none;
              border: 0;
              padding: 0;
              margin-top: 6px;
              font-size: 12px;
              font-weight: 600;
              color: #111111;
              text-decoration: underline;
              text-underline-offset: 2px;
              cursor: pointer;
              display: block;
            }
            .ops-link:hover {
              color: #e10600;
            }

            .ops-perms {
              display: flex;
              flex-wrap: wrap;
              gap: 5px;
              max-width: 260px;
            }
            .ops-chip {
              background: #f3f4f6;
              border-radius: 6px;
              padding: 3px 8px;
              font-size: 11.5px;
              color: #374151;
              white-space: nowrap;
            }
            .ops-chip-more {
              background: #fff;
              border: 1px dashed #d1d5db;
              color: #6b7280;
            }

            .ops-actions {
              display: flex;
              flex-direction: column;
              gap: 6px;
              align-items: flex-end;
            }

            .ops-pager {
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 10px;
              margin-top: 16px;
            }
            .ops-page-n {
              font-size: 12.5px;
              color: #6b7280;
            }

            .ops-modal {
              background: rgba(17, 17, 17, 0.45);
            }
            .ops-perm-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 8px;
            }
            .ops-perm {
              display: flex;
              align-items: center;
              gap: 9px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background: #fff;
              padding: 10px 12px;
              font-size: 13px;
              color: #111111;
              text-align: left;
              cursor: pointer;
            }
            .ops-perm:hover {
              border-color: #c9cdd3;
            }
            .ops-perm-on {
              border-color: #111111;
              background: #f7f7f8;
              font-weight: 600;
            }
            .ops-perm-box {
              width: 18px;
              height: 18px;
              border-radius: 5px;
              border: 1px solid #c9cdd3;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              color: #fff;
              flex: none;
            }
            .ops-perm-on .ops-perm-box {
              background: #111111;
              border-color: #111111;
            }

            @media (max-width: 768px) {
              .ops-range {
                margin-left: 0;
                width: 100%;
              }
              .ops-search {
                max-width: none;
              }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
