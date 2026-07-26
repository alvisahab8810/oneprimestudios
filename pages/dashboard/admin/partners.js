// "use client";
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import toast from "react-hot-toast";

// import { FaUser, FaChartPie, FaUsers, FaCogs, FaBell } from "react-icons/fa";
// import Link from "next/link";
// import Sidebar from "@/components/admin-panel/Sidebar";

// export default function PartnerApprovalPage() {
//   const [search, setSearch] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10; // You can change as needed

//   const [cityFilter, setCityFilter] = useState("");

//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

//   const [partners, setPartners] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [updatingIds, setUpdatingIds] = useState([]); // ✅ track which partner is updating

//   // FILTER DATA
//   const filteredPartners = partners.filter((p) => {
//     const matchSearch =
//       p.name.toLowerCase().includes(search.toLowerCase()) ||
//       p.email.toLowerCase().includes(search.toLowerCase()) ||
//       (p.companyName || "").toLowerCase().includes(search.toLowerCase()) ||
//       p.phone.includes(search);

//     const matchStatus =
//       statusFilter === "all"
//         ? true
//         : statusFilter === "approved"
//         ? p.isApproved === true
//         : p.isApproved === false;

//     return matchSearch && matchStatus;
//   });

//   // PAGINATION
//   const indexOfLastItem = currentPage * itemsPerPage;
//   const indexOfFirstItem = indexOfLastItem - itemsPerPage;
//   const currentPartners = filteredPartners.slice(
//     indexOfFirstItem,
//     indexOfLastItem
//   );

//   const totalPages = Math.ceil(filteredPartners.length / itemsPerPage);

//   useEffect(() => {
//     fetchPartners();
//   }, []);

//   const fetchPartners = async () => {
//     try {
//       const res = await axios.get("/api/admin/get-partners");
//       setPartners(res.data);
//     } catch (error) {
//       console.error("Error fetching partners:", error);
//       toast.error("Failed to load partners.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleApproval = async (userId, currentStatus) => {
//     try {
//       setUpdatingIds((prev) => [...prev, userId]); // ✅ show spinner for this partner

//       const res = await axios.put("/api/admin/approve-partner", {
//         userId,
//         isApproved: !currentStatus,
//       });

//       toast.success(res.data.message);

//       // ✅ update state locally instead of refetching
//       setPartners((prev) =>
//         prev.map((p) =>
//           p._id === userId ? { ...p, isApproved: !currentStatus } : p
//         )
//       );
//     } catch (error) {
//       console.error("Approval error:", error);
//       toast.error("Failed to update approval status.");
//     } finally {
//       setUpdatingIds((prev) => prev.filter((id) => id !== userId));
//     }
//   };

//   if (loading) return <p className="text-center mt-5">Loading...</p>;

//   return (
//     <div className="d-flex">
//       {/* Sidebar */}
//       <Sidebar sidebarOpen={sidebarOpen} />

//       {/* Main content */}
//       <div
//         className="main-area"
      
//       >
//         {/* Top navbar */}
//         <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 shadow-sm">
//           <button
//             className="btn btn-outline-primary me-3"
//             onClick={toggleSidebar}
//           >
//             ☰
//           </button>
//           <div className="ms-auto d-flex align-items-center">
//             <FaBell className="me-3" size={20} />
//             <div className="dropdown">
//               <button
//                 className="btn btn-secondary dropdown-toggle"
//                 type="button"
//                 id="profileDropdown"
//                 data-bs-toggle="dropdown"
//                 aria-expanded="false"
//               >
//                 Admin
//               </button>
//               <ul
//                 className="dropdown-menu dropdown-menu-end"
//                 aria-labelledby="profileDropdown"
//               >
//                 <li>
//                   <Link className="dropdown-item" href="#">
//                     Profile
//                   </Link>
//                 </li>
//                 <li>
//                   <Link className="dropdown-item" href="#">
//                     Logout
//                   </Link>
//                 </li>
//               </ul>
//             </div>
//           </div>
//         </nav>

//         {/* Dashboard content */}
//         <div className="container-fluid p-4">
//           <h1 className="dashboard-main-h">Partner Approvals</h1>

//           {/* FILTER BAR */}
//           <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
//             {/* Search Box */}
//             <input
//               type="text"
//               className="form-control w-auto"
//               placeholder="Search by name, email, company, phone..."
//               value={search}
//               onChange={(e) => {
//                 setSearch(e.target.value);
//                 setCurrentPage(1);
//               }}
//               style={{ minWidth: "280px" }}
//             />

//             {/* Status Filter */}
//             <select
//               className="form-select w-auto"
//               value={statusFilter}
//               onChange={(e) => {
//                 setStatusFilter(e.target.value);
//                 setCurrentPage(1);
//               }}
//             >
//               <option value="all">All</option>
//               <option value="approved">Approved</option>
//               <option value="pending">Pending</option>
//             </select>
//           </div>

//           <div className="partner-approval-area">
//             <table className="table table-bordered table-hover align-middle">
//               <thead className="table-dark">
//                 <tr>
//                   <th>Name</th>
//                   <th>Company</th>
//                   <th>Email</th>
//                   <th>Phone</th>
//                   <th>Approved</th>
//                   <th>Action</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {partners.length === 0 ? (
//                   <tr>
//                     <td colSpan="6" className="text-center">
//                       No partners found.
//                     </td>
//                   </tr>
//                 ) : (
//                   currentPartners.map((partner) => {
//                     const isUpdating = updatingIds.includes(partner._id);

//                     return (
//                       <tr key={partner._id}>
//                         <td>{partner.name}</td>
//                         <td>{partner.companyName || "-"}</td>
//                         <td>{partner.email}</td>
//                         <td>{partner.phone}</td>
//                         <td>
//                           <span
//                             className={`badge ${
//                               partner.isApproved
//                                 ? "bg-success"
//                                 : "bg-warning text-dark"
//                             }`}
//                           >
//                             {partner.isApproved ? "Approved" : "Pending"}
//                           </span>
//                         </td>
//                         <td>
//                           <button
//                             className={`btn btn-sm ${
//                               partner.isApproved ? "btn-danger" : "btn-success"
//                             }`}
//                             onClick={() =>
//                               handleApproval(partner._id, partner.isApproved)
//                             }
//                             disabled={isUpdating} // ✅ disable while updating
//                           >
//                             {isUpdating ? (
//                               <span
//                                 className="spinner-border spinner-border-sm"
//                                 role="status"
//                                 aria-hidden="true"
//                               ></span>
//                             ) : partner.isApproved ? (
//                               "Revoke"
//                             ) : (
//                               "Approve"
//                             )}
//                           </button>
//                         </td>
//                       </tr>
//                     );
//                   })
//                 )}
//               </tbody>

//               {/* PAGINATION */}
//               <div className="d-flex justify-content-center mt-3">
//                 <nav>
//                   <ul className="pagination">
//                     {/* Prev */}
//                     <li
//                       className={`page-item ${
//                         currentPage === 1 ? "disabled" : ""
//                       }`}
//                     >
//                       <button
//                         className="page-link"
//                         onClick={() => setCurrentPage((prev) => prev - 1)}
//                       >
//                         Previous
//                       </button>
//                     </li>

//                     {/* Page Numbers */}
//                     {[...Array(totalPages)].map((_, index) => (
//                       <li
//                         key={index}
//                         className={`page-item ${
//                           currentPage === index + 1 ? "active" : ""
//                         }`}
//                       >
//                         <button
//                           className="page-link"
//                           onClick={() => setCurrentPage(index + 1)}
//                         >
//                           {index + 1}
//                         </button>
//                       </li>
//                     ))}

//                     {/* Next */}
//                     <li
//                       className={`page-item ${
//                         currentPage === totalPages ? "disabled" : ""
//                       }`}
//                     >
//                       <button
//                         className="page-link"
//                         onClick={() => setCurrentPage((prev) => prev + 1)}
//                       >
//                         Next
//                       </button>
//                     </li>
//                   </ul>
//                 </nav>
//               </div>
//             </table>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }













"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

import { FaUser, FaChartPie, FaUsers, FaCogs, FaBell } from "react-icons/fa";
import Link from "next/link";
import Sidebar from "@/components/admin-panel/Sidebar";

export default function PartnerApprovalPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // You can change as needed

  const [cityFilter, setCityFilter] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState([]); // ✅ track which partner is updating

  // ── Reset password modal ──────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState(null); // partner being reset
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [justSetPassword, setJustSetPassword] = useState(null); // { partnerId, password } shown after success

  const openResetModal = (partner) => {
    setResetTarget(partner);
    setNewPassword("");
    setShowPassword(false);
  };

  const closeResetModal = () => {
    setResetTarget(null);
    setNewPassword("");
  };

  const submitResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      setResetting(true);
      await axios.put("/api/admin/reset-partner-password", {
        userId: resetTarget._id,
        newPassword,
      });
      toast.success("Password reset successfully");
      setJustSetPassword({ partnerId: resetTarget._id, password: newPassword });
      closeResetModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  // FILTER DATA
const filteredPartners = partners.filter((p) => {
const q = search.toLowerCase();

const matchSearch =
  p.name?.toLowerCase().includes(q) ||
  p.email?.toLowerCase().includes(q) ||
  (p.companyName || "").toLowerCase().includes(q) ||
  p.phone?.includes(search) ||
  p.city?.toLowerCase().includes(q) ||       // ✅ city search
  p.pinCode?.includes(search);                // ✅ pincode search

  const matchStatus =
    statusFilter === "all"
      ? true
      : statusFilter === "approved"
      ? p.isApproved
      : !p.isApproved;

  const matchCity = cityFilter
    ? p.city?.toLowerCase() === cityFilter.toLowerCase()
    : true;

  return matchSearch && matchStatus && matchCity;
});


  // PAGINATION
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPartners = filteredPartners.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const totalPages = Math.ceil(filteredPartners.length / itemsPerPage);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const res = await axios.get("/api/admin/get-partners");
      setPartners(res.data);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to load partners.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId, currentStatus) => {
    try {
      setUpdatingIds((prev) => [...prev, userId]); // ✅ show spinner for this partner

      const res = await axios.put("/api/admin/approve-partner", {
        userId,
        isApproved: !currentStatus,
      });

      toast.success(res.data.message);

      // ✅ update state locally instead of refetching
      setPartners((prev) =>
        prev.map((p) =>
          p._id === userId ? { ...p, isApproved: !currentStatus } : p
        )
      );
    } catch (error) {
      console.error("Approval error:", error);
      toast.error("Failed to update approval status.");
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const totalCount = partners.length;
  const approvedCount = partners.filter((p) => p.isApproved).length;
  const pendingCount = totalCount - approvedCount;

  const getInitials = (name = "") =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  const AVATAR_COLORS = ["#111827", "#7c3aed", "#0891b2", "#b45309", "#be123c", "#15803d"];
  const avatarColor = (id) => {
    let hash = 0;
    for (let i = 0; i < (id || "").length; i++) hash = (hash + id.charCodeAt(i)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[hash];
  };

  if (loading) {
    return (
      <div className="d-flex">
        <Sidebar sidebarOpen={sidebarOpen} />
        <div className="main-area">
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              minHeight: "60vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8a8a86",
              fontSize: 14,
            }}
          >
            Loading partners…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} />

      {/* Main content */}
      <div className="main-area" style={{ background: "#f7f7f5", minHeight: "100vh" }}>
        {/* Top navbar */}
        <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 shadow-sm">
          <button
            className="btn btn-outline-primary me-3"
            onClick={toggleSidebar}
          >
            ☰
          </button>
          <div className="ms-auto d-flex align-items-center">
            <FaBell className="me-3" size={20} />
            <div className="dropdown">
              <button
                className="btn btn-secondary dropdown-toggle"
                type="button"
                id="profileDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Admin
              </button>
              <ul
                className="dropdown-menu dropdown-menu-end"
                aria-labelledby="profileDropdown"
              >
                <li>
                  <Link className="dropdown-item" href="#">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item" href="#">
                    Logout
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Dashboard content */}
        <div style={{ fontFamily: "'DM Sans', sans-serif", padding: "28px 32px 48px" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 4px" }}>
              Partner Approvals
            </h1>
            <p style={{ margin: 0, fontSize: 13.5, color: "#8a8a86" }}>
              Review, approve, and manage login access for all registered partners.
            </p>
          </div>

          {/* STAT CARDS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 22,
            }}
          >
            <div
              style={{
                background: "#111",
                borderRadius: 14,
                padding: "18px 20px",
                color: "#fff",
              }}
            >
              <p style={{ margin: "0 0 6px", fontSize: 12.5, color: "#c9c9c9", fontWeight: 600 }}>
                Total Partners
              </p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{totalCount}</p>
            </div>
            <div
              style={{
                background: "#fff",
                border: "1.5px solid #f0f0f0",
                borderRadius: 14,
                padding: "18px 20px",
              }}
            >
              <p style={{ margin: "0 0 6px", fontSize: 12.5, color: "#8a8a86", fontWeight: 600 }}>
                Approved
              </p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#15803d" }}>
                {approvedCount}
              </p>
            </div>
            <div
              style={{
                background: "#fff",
                border: "1.5px solid #f0f0f0",
                borderRadius: 14,
                padding: "18px 20px",
              }}
            >
              <p style={{ margin: "0 0 6px", fontSize: 12.5, color: "#8a8a86", fontWeight: 600 }}>
                Pending
              </p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#b45309" }}>
                {pendingCount}
              </p>
            </div>
          </div>

          {/* FILTER BAR */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <input
              type="text"
              placeholder="Search by name, email, city, pincode, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                flex: "1 1 260px",
                minWidth: 240,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid #e5e5e2",
                fontSize: 13.5,
                fontFamily: "inherit",
                outline: "none",
                background: "#fff",
              }}
            />

            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid #e5e5e2",
                fontSize: 13.5,
                fontFamily: "inherit",
                background: "#fff",
                color: "#111",
                cursor: "pointer",
              }}
            >
              <option value="">All Cities</option>
              {[...new Set(partners.map((p) => p.city).filter(Boolean))].map(
                (city, idx) => (
                  <option key={idx} value={city}>
                    {city}
                  </option>
                )
              )}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1.5px solid #e5e5e2",
                fontSize: 13.5,
                fontFamily: "inherit",
                background: "#fff",
                color: "#111",
                cursor: "pointer",
              }}
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* TABLE */}
          <div
            style={{
              background: "#fff",
              border: "1.5px solid #f0f0f0",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#fafaf9", borderBottom: "1.5px solid #f0f0f0" }}>
                    {["Member ID", "Partner", "Company", "Email", "Phone", "City", "Status", "Action"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "12px 16px",
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: "#8a8a86",
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {partners.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", padding: "40px 16px", color: "#8a8a86" }}>
                        No partners found.
                      </td>
                    </tr>
                  ) : currentPartners.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", padding: "40px 16px", color: "#8a8a86" }}>
                        No partners match your filters.
                      </td>
                    </tr>
                  ) : (
                    currentPartners.map((partner) => {
                      const isUpdating = updatingIds.includes(partner._id);

                      return (
                        <tr
                          key={partner._id}
                          style={{ borderBottom: "1px solid #f5f5f3" }}
                        >
                          <td style={{ padding: "12px 16px", color: "#555", whiteSpace: "nowrap" }}>
                            {partner.memberId || "-"}
                          </td>
                          <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 30,
                                  height: 30,
                                  borderRadius: "50%",
                                  background: avatarColor(partner._id),
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  flexShrink: 0,
                                }}
                              >
                                {getInitials(partner.name)}
                              </div>
                              <span style={{ fontWeight: 600, color: "#111" }}>{partner.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#555" }}>{partner.companyName || "-"}</td>
                          <td style={{ padding: "12px 16px", color: "#555" }}>{partner.email}</td>
                          <td style={{ padding: "12px 16px", color: "#555", whiteSpace: "nowrap" }}>{partner.phone}</td>
                          <td style={{ padding: "12px 16px", color: "#555" }}>{partner.city || "-"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: 999,
                                fontSize: 11.5,
                                fontWeight: 700,
                                background: partner.isApproved ? "#f0fdf4" : "#fffbeb",
                                color: partner.isApproved ? "#15803d" : "#b45309",
                                border: `1px solid ${partner.isApproved ? "#bbf7d0" : "#fde68a"}`,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {partner.isApproved ? "Approved" : "Pending"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={() =>
                                    handleApproval(partner._id, partner.isApproved)
                                  }
                                  disabled={isUpdating}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: 8,
                                    border: "none",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#fff",
                                    background: partner.isApproved ? "#dc2626" : "#111",
                                    cursor: isUpdating ? "not-allowed" : "pointer",
                                    opacity: isUpdating ? 0.6 : 1,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {isUpdating ? "..." : partner.isApproved ? "Revoke" : "Approve"}
                                </button>
                                <button
                                  onClick={() => openResetModal(partner)}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: 8,
                                    border: "1.5px solid #e5e5e2",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    color: "#111",
                                    background: "#fff",
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Reset Password
                                </button>
                              </div>
                              {justSetPassword?.partnerId === partner._id && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    padding: "6px 10px",
                                    background: "#f0fdf4",
                                    border: "1px solid #86efac",
                                    borderRadius: 8,
                                    fontSize: 11.5,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span style={{ color: "#15803d" }}>
                                    New password: <strong>{justSetPassword.password}</strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(justSetPassword.password);
                                      toast.success("Copied to clipboard");
                                    }}
                                    style={{
                                      border: "none",
                                      background: "none",
                                      color: "#15803d",
                                      fontWeight: 700,
                                      fontSize: 11.5,
                                      cursor: "pointer",
                                      padding: 0,
                                    }}
                                  >
                                    Copy
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setJustSetPassword(null)}
                                    style={{
                                      border: "none",
                                      background: "none",
                                      color: "#8a8a86",
                                      fontSize: 11.5,
                                      cursor: "pointer",
                                      padding: 0,
                                    }}
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {filteredPartners.length > 0 && totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "14px 16px",
                  borderTop: "1px solid #f0f0f0",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #e5e5e2",
                    background: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    color: currentPage === 1 ? "#c9c9c9" : "#111",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Previous
                </button>

                {[...Array(totalPages)].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index + 1)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      border: "1.5px solid",
                      borderColor: currentPage === index + 1 ? "#111" : "#e5e5e2",
                      background: currentPage === index + 1 ? "#111" : "#fff",
                      color: currentPage === index + 1 ? "#fff" : "#111",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {index + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #e5e5e2",
                    background: "#fff",
                    fontSize: 12,
                    fontWeight: 600,
                    color: currentPage === totalPages ? "#c9c9c9" : "#111",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Reset Password Modal ── */}
      {resetTarget && (
        <div
          onClick={closeResetModal}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, padding: 26, width: 380, maxWidth: "90vw" }}
          >
            <h5 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#111" }}>
              Reset Password
            </h5>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#8a8a86" }}>
              Set a new login password for <strong style={{ color: "#111" }}>{resetTarget.name}</strong> ({resetTarget.email})
            </p>

            <div style={{ position: "relative", marginBottom: 16 }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 60px 10px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #e5e5e2",
                  fontSize: 13.5,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  color: "#7c3aed",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={closeResetModal}
                disabled={resetting}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1.5px solid #e5e5e2",
                  background: "#fff",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#111",
                  cursor: resetting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitResetPassword}
                disabled={resetting}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#111",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: resetting ? "not-allowed" : "pointer",
                  opacity: resetting ? 0.7 : 1,
                }}
              >
                {resetting ? "Setting..." : "Set Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
