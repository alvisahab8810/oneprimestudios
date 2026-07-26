// import { useState } from "react";
// import toast from "react-hot-toast";

// export default function CreateUser() {
//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [role, setRole] = useState("");
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!name || !email || !role) {
//       toast.error("All fields are required");
//       return;
//     }

//     setLoading(true);

//     const toastId = toast.loading("Sending invite...");

//     try {
//       const res = await fetch("/api/admin/create-user", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         credentials: "include",
//         body: JSON.stringify({ name, email, role }),
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         throw new Error(data.message || "Failed to send invite");
//       }

//       toast.success("Invite sent successfully", { id: toastId });

//       setName("");
//       setEmail("");
//       setRole("");
//     } catch (err) {
//       toast.error(err.message, { id: toastId });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container mt-4">
//       <div className="card shadow p-4" style={{ maxWidth: "520px" }}>
//         <h4 className="mb-3">Create OPS User</h4>

//         <form onSubmit={handleSubmit}>
//           <div className="mb-3">
//             <label className="form-label">Name</label>
//             <input
//               className="form-control"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               disabled={loading}
//               required
//             />
//           </div>

//           <div className="mb-3">
//             <label className="form-label">Email</label>
//             <input
//               type="email"
//               className="form-control"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               disabled={loading}
//               required
//             />
//           </div>

//           <div className="mb-3">
//             <label className="form-label">Role</label>
//             <select
//               className="form-select"
//               value={role}
//               onChange={(e) => setRole(e.target.value)}
//               disabled={loading}
//               required
//             >
//               <option value="">Select Role</option>
//               <option value="designer">Designer</option>
//               <option value="product_manager">Product Manager</option>
//               <option value="manager">Manager</option>
//             </select>
//           </div>

//           <button
//             type="submit"
//             className="btn btn-primary w-100"
//             disabled={loading}
//           >
//             {loading ? "Sending Invite..." : "Send Invite"}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }




"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaBell } from "react-icons/fa";

import Sidebar from "@/components/admin-panel/Sidebar";

const ROLE_OPTIONS = [
  { value: "designer", label: "Designer", desc: "Access to dashboard & orders" },
  { value: "product_manager", label: "Product Manager", desc: "Access to dashboard, products & orders" },
  { value: "manager", label: "Manager", desc: "Access to dashboard, orders & partners" },
  { value: "finance", label: "Finance", desc: "Access to dashboard & invoice creation" },
];

export default function CreateUser() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !role) {
      toast.error("All fields are required");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Sending invite...");

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send invite");
      }

      toast.success("Invite sent successfully", { id: toastId });

      setName("");
      setEmail("");
      setRole("");
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1.5px solid #e5e5e2",
    fontSize: 13.5,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    background: "#fff",
  };

  const labelStyle = {
    display: "block",
    fontSize: 12.5,
    fontWeight: 700,
    color: "#111",
    marginBottom: 6,
  };

  return (
    <div className="admin-dashboard-v2 d-flex">
      {/* SIDEBAR */}
      <Sidebar sidebarOpen={sidebarOpen} />

      {/* MAIN AREA */}
      <div className="main-area" style={{ background: "#f7f7f5", minHeight: "100vh" }}>
        {/* TOP BAR */}
        <nav className="navbar navbar-light bg-light admin-topbar">
          <button
            className="btn btn-outline-primary me-3"
            onClick={toggleSidebar}
          >
            <img src="/assets/images/admin/indent-decrease.svg" />
          </button>

          <div className="ms-auto d-flex align-items-center">
            <FaBell className="me-3" size={20} />
            <div className="user-flow-icon">
              <img src="/assets/images/admin/profile.svg" />
            </div>
          </div>
        </nav>

        {/* CONTENT */}
        <div style={{ fontFamily: "'DM Sans', sans-serif", padding: "28px 32px 48px" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 4px" }}>
              Create OPS User
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: "#8a8a86" }}>
              Invite a new team member and assign them a role with the right level of access.
            </p>
          </div>

          <div
            style={{
              background: "#fff",
              border: "1.5px solid #f0f0f0",
              borderRadius: 14,
              padding: 28,
              maxWidth: 480,
            }}
          >
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Name</label>
                <input
                  style={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  placeholder="Full name"
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  style={inputStyle}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Role</label>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={loading}
                  required
                >
                  <option value="">Select Role</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {role && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#8a8a86" }}>
                    {ROLE_OPTIONS.find((r) => r.value === role)?.desc}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "11px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "#111",
                  color: "#fff",
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Sending Invite..." : "Send Invite"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
