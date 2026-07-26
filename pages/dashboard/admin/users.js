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
                    <th>Permissions</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td className="text-capitalize">
                          {user.role.replace("_", " ")}
                        </td>
                        <td>
                          {user.isActive ? (
                            <span className="badge bg-success">Active</span>
                          ) : (
                            <span className="badge bg-warning text-dark">
                              Pending
                            </span>
                          )}
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

                        <td>
                          {user.role !== "admin" && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => deleteUser(user._id)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
