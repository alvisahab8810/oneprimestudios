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

import Sidebar from "@/components/admin-panel/Sidebar";

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

  return (
    <div className="admin-dashboard-v2 d-flex">
      {/* SIDEBAR */}
      <Sidebar sidebarOpen={sidebarOpen} />

      {/* MAIN AREA */}
      <div className="main-area">
        <div className="main-area-pad">

          {/* TOP BAR */}
          <nav className="navbar navbar-light bg-light admin-topbar">
            <button
              className="btn btn-outline-primary me-3"
              onClick={toggleSidebar}
            >
              <img src="/assets/images/admin/indent-decrease.svg" />
            </button>

            <div className="ms-auto d-flex align-items-center">
              <div className="user-flow-icon">
                <img src="/assets/images/admin/profile.svg" />
              </div>
            </div>
          </nav>

          {/* CONTENT */}
          <div className="content-dashbord mt-3">
            <h2 className="dashboard-main-h mb-4">
              Create OPS User
            </h2>

            <div
              className="card  p-4"
              
            >
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                    required
                  >
                    <option value="">Select Role</option>
                    <option value="designer">Designer</option>
                    <option value="product_manager">
                      Product Manager
                    </option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? "Sending Invite..." : "Send Invite"}
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
