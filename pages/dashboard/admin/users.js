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
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

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

// A super admin's own account, and any other super admin, is managed from the
// database rather than from this screen — nobody can lock themselves out here.
function isLocked(user, meId) {
  if (String(user._id) === String(meId)) return true;
  return user.role === "admin" || user.role === "super_admin";
}

export default function AdminUsersPage() {
  const [sidebarOpen] = useState(true);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const limit = 5;
  const [hasMore, setHasMore] = useState(false);

  // The signed-in super admin, so their own row cannot be edited away
  const [meId, setMeId] = useState("");

  // Row-level work in progress, keyed by user id
  const [busyId, setBusyId] = useState("");

  // The invite / reset link, shown so it can be shared even if email fails
  const [linkInfo, setLinkInfo] = useState(null);

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
    } catch (err) {
      toast.error(err.message || "Failed to update permission");
    }
  };

  /* ================= DELETE USER ================= */
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
        <div className="main-area-pad">

          {/* HEADER */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2 className="dashboard-main-h">OPS Users</h2>

            <Link
              href="/dashboard/admin/create-user"
              className="btn btn-primary"
            >
              + Create User
            </Link>
          </div>

          {/* FILTERS */}
          <div className="row mb-3">
            <div className="col-md-4">
              <input
                className="form-control"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
              />
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={role}
                onChange={(e) => {
                  setPage(1);
                  setRole(e.target.value);
                }}
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="designer">Designer</option>
                <option value="product_manager">Product Manager</option>
                <option value="finance">Finance</option>
              </select>
            </div>
          </div>

          {/* TABLE */}
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th>
                    <th>Permissions</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td style={{ minWidth: 150 }}>
                          {isLocked(user, meId) ? (
                            <span className="text-capitalize">
                              {user.role.replace("_", " ")}
                            </span>
                          ) : (
                            <select
                              className="form-select form-select-sm"
                              value={user.role}
                              disabled={busyId === user._id}
                              onChange={(e) =>
                                updateUser(
                                  user,
                                  { role: e.target.value },
                                  `Change ${user.name}'s role to "${e.target.value.replace("_", " ")}"?`,
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
                        <td style={{ minWidth: 130 }}>
                          {user.isActive ? (
                            <span className="badge bg-success">Active</span>
                          ) : user.hasPassword ? (
                            <span className="badge bg-danger">Suspended</span>
                          ) : user.invitePending ? (
                            <span className="badge bg-warning text-dark">Invite sent</span>
                          ) : (
                            <span className="badge bg-secondary">Invite expired</span>
                          )}

                          {!user.isActive && !user.hasPassword && user.inviteExpiresAt && (
                            <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                              {user.invitePending ? "Expires " : "Expired "}
                              {formatLoginTime(user.inviteExpiresAt)}
                            </div>
                          )}
                        </td>

                        <td style={{ minWidth: 170 }}>
                          {user.lastLoginAt ? (
                            <>
                              <div style={{ fontSize: 13 }}>{formatLoginTime(user.lastLoginAt)}</div>
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                {user.loginCount || 0} login{(user.loginCount || 0) === 1 ? "" : "s"}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted" style={{ fontSize: 13 }}>Never logged in</span>
                          )}

                          <button
                            className="btn btn-sm btn-outline-secondary mt-1"
                            style={{ fontSize: 11, padding: "2px 8px" }}
                            onClick={() => openHistory(user)}
                          >
                            View history
                          </button>
                        </td>

                        <td style={{ minWidth: 260 }}>
                          {PERMISSIONS.map((perm) => (
                            <label
                              key={perm.key}
                              className="me-3 d-inline-block"
                            >
                              <input
                                type="checkbox"
                                checked={user.permissions?.includes(perm.key)}
                                onChange={() =>
                                  togglePermission(user._id, perm.key)
                                }
                              />
                              <span className="ms-1">{perm.label}</span>
                            </label>
                          ))}
                        </td>

                        <td style={{ minWidth: 150 }}>
                          {isLocked(user, meId) ? (
                            <span className="text-muted" style={{ fontSize: 12 }}>
                              {String(user._id) === String(meId)
                                ? "This is you"
                                : "Super admin"}
                            </span>
                          ) : (
                            <div className="d-flex flex-column gap-1">
                              {user.hasPassword ? (
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  disabled={busyId === user._id}
                                  onClick={() => sendAccessLink(user, "reset")}
                                >
                                  Reset password
                                </button>
                              ) : (
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  disabled={busyId === user._id}
                                  onClick={() => sendAccessLink(user, "invite")}
                                >
                                  {user.invitePending ? "Resend invite" : "Send invite"}
                                </button>
                              )}

                              {user.hasPassword && (
                                <button
                                  className={
                                    user.isActive
                                      ? "btn btn-sm btn-outline-warning"
                                      : "btn btn-sm btn-outline-success"
                                  }
                                  disabled={busyId === user._id}
                                  onClick={() =>
                                    updateUser(
                                      user,
                                      { isActive: !user.isActive },
                                      user.isActive
                                        ? `Suspend ${user.name}? They will not be able to sign in.`
                                        : `Restore access for ${user.name}?`,
                                    )
                                  }
                                >
                                  {user.isActive ? "Suspend" : "Restore access"}
                                </button>
                              )}

                              <button
                                className="btn btn-sm btn-danger"
                                disabled={busyId === user._id}
                                onClick={() => deleteUser(user._id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* INVITE / RESET LINK */}
          {linkInfo && (
            <div
              className="modal d-block"
              style={{ background: "rgba(0,0,0,0.45)" }}
              onClick={() => setLinkInfo(null)}
            >
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
                      <button className="btn btn-primary" onClick={() => copyLink(linkInfo.link)}>
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
                    <button className="btn btn-secondary" onClick={() => setLinkInfo(null)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LOGIN HISTORY */}
          {historyUser && (
            <div
              className="modal d-block"
              style={{ background: "rgba(0,0,0,0.45)" }}
              onClick={closeHistory}
            >
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
                        <table className="table table-sm table-bordered align-middle mb-0">
                          <thead className="table-light">
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
                                        ? "badge bg-secondary"
                                        : "badge bg-success"
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
                    <button className="btn btn-secondary" onClick={closeHistory}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAGINATION */}
          <div className="d-flex justify-content-end mt-3">
            <button
              className="btn btn-outline-secondary me-2"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>

            <button
              className="btn btn-outline-secondary"
              disabled={!hasMore}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
