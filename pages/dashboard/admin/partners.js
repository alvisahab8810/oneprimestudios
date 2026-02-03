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

  if (loading) return <p className="text-center mt-5">Loading...</p>;

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} />

      {/* Main content */}
      <div
        className="main-area"
      
      >
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
        <div className="container-fluid p-4">
          <h1 className="dashboard-main-h">Partner Approvals</h1>

          {/* FILTER BAR */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            {/* Search Box */}
            <input
              type="text"
              className="form-control w-auto"
              placeholder="Search by name, email, city, pincode, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: "280px" }}
            />

            <div className="d-flex gap-2">
              <select
  className="form-select w-auto"
  value={cityFilter}
  onChange={(e) => {
    setCityFilter(e.target.value);
    setCurrentPage(1);
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


            {/* Status Filter */}
            <select
              className="form-select w-auto"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>
            </div>
          </div>

          <div className="partner-approval-area">
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>City</th>

                  <th>Approved</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {partners.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center">
                      No partners found.
                    </td>
                  </tr>
                ) : (
                  currentPartners.map((partner) => {
                    const isUpdating = updatingIds.includes(partner._id);

                    return (
                      <tr key={partner._id}>
                        <td>{partner.name}</td>
                        <td>{partner.companyName || "-"}</td>
                        <td>{partner.email}</td>
                        <td>{partner.phone}</td>
                        <td>{partner.city || "-"}</td>
                        <td>
                          <span
                            className={`badge ${
                              partner.isApproved
                                ? "bg-success"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {partner.isApproved ? "Approved" : "Pending"}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${
                              partner.isApproved ? "btn-danger" : "btn-success"
                            }`}
                            onClick={() =>
                              handleApproval(partner._id, partner.isApproved)
                            }
                            disabled={isUpdating} // ✅ disable while updating
                          >
                            {isUpdating ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                                aria-hidden="true"
                              ></span>
                            ) : partner.isApproved ? (
                              "Revoke"
                            ) : (
                              "Approve"
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* PAGINATION */}
              <div className="d-flex justify-content-center mt-3">
                <nav>
                  <ul className="pagination">
                    {/* Prev */}
                    <li
                      className={`page-item ${
                        currentPage === 1 ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                      >
                        Previous
                      </button>
                    </li>

                    {/* Page Numbers */}
                    {[...Array(totalPages)].map((_, index) => (
                      <li
                        key={index}
                        className={`page-item ${
                          currentPage === index + 1 ? "active" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(index + 1)}
                        >
                          {index + 1}
                        </button>
                      </li>
                    ))}

                    {/* Next */}
                    <li
                      className={`page-item ${
                        currentPage === totalPages ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
