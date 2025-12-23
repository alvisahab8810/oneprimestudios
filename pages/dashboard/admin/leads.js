// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";
// import Sidebar from "@/components/admin-panel/Sidebar";
// import toast from "react-hot-toast";
// import Link from "next/link";
// import { FaBell } from "react-icons/fa";

// export default function AdminLeads() {
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [leads, setLeads] = useState([]);

//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

//   const fetchLeads = async () => {
//     try {
//       const res = await axios.get("/api/contact/list");
//       setLeads(res.data.data || []);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load leads");
//     }
//   };

//   const deleteLead = async (id) => {
//     if (!confirm("Delete this lead?")) return;

//     try {
//       await axios.delete(`/api/contact/delete/${id}`);
//       toast.success("Lead deleted");
//       fetchLeads();
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to delete lead");
//     }
//   };

//   useEffect(() => {
//     fetchLeads();
//   }, []);

//   return (
//     <div className="d-flex">
//       {/* Sidebar */}
//       <Sidebar sidebarOpen={sidebarOpen} />

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
//                 data-bs-toggle="dropdown"
//               >
//                 Admin
//               </button>
//               <ul className="dropdown-menu dropdown-menu-end">
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

//         {/* Page Content */}
//         <div className="container-fluid p-4">
//           <h1 className="dashboard-main-h">Contact Leads</h1>

//           <div className="table-responsive">
//             <table className="table table-bordered align-middle">
//               <thead className="table-light">
//                 <tr>
//                   <th>Name</th>
//                   <th>Email</th>
//                   <th>Phone</th>
//                   <th>Message</th>
//                   <th>Date</th>
//                   <th style={{ width: "120px" }}>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {leads.length === 0 ? (
//                   <tr>
//                     <td colSpan="7" className="text-center text-muted">
//                       No leads found
//                     </td>
//                   </tr>
//                 ) : (
//                   leads.map((lead) => (
//                     <tr key={lead._id}>
//                       <td>{lead.firstName} {lead.lastName}</td>
//                       <td>{lead.email}</td>
//                       <td>{lead.phone}</td>
//                       <td>{lead.message || "-"}</td>
//                       <td>
//                         {new Date(lead.createdAt).toLocaleString("en-IN")}
//                       </td>
//                       <td>
//                         <button
//                           className="btn btn-sm btn-outline-danger"
//                           onClick={() => deleteLead(lead._id)}
//                         >
//                           Delete
//                         </button>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }











"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import toast from "react-hot-toast";
import Link from "next/link";
import { FaBell, FaUserPlus } from "react-icons/fa";

export default function AdminLeads() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔍 Filters
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  // 📄 Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const fetchLeads = async () => {
    try {
      const res = await axios.get("/api/contact/list");
      setLeads(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const deleteLead = async (id) => {
    if (!confirm("Delete this lead?")) return;

    try {
      await axios.delete(`/api/contact/delete/${id}`);
      toast.success("Lead deleted");
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete lead");
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // 🔍 FILTER + SORT
  const filteredLeads = leads
    .filter((lead) => {
      const text = `
        ${lead.firstName}
        ${lead.lastName}
        ${lead.email}
        ${lead.phone}
        ${lead.message || ""}
      `.toLowerCase();

      return text.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  // 📄 PAGINATION LOGIC
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeads = filteredLeads.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} />

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
                data-bs-toggle="dropdown"
              >
                Admin
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
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

        {/* Page Content */}
        <div className="container-fluid p-4">
          <h1 className="dashboard-main-h">
           
            Contact Leads
          </h1>

          {/* 🔍 FILTER BAR */}
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
            <input
              type="text"
              className="form-control w-auto"
              placeholder="Search by name, email, phone, message..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: "280px" }}
            />

            <select
              className="form-select w-auto"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* TABLE */}
          <div className="table-responsive">
            <table className="table table-bordered table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Message</th>
                  <th>Date</th>
                  <th style={{ width: "120px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center">
                      Loading...
                    </td>
                  </tr>
                ) : currentLeads.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted">
                      No leads found
                    </td>
                  </tr>
                ) : (
                  currentLeads.map((lead) => (
                    <tr key={lead._id}>
                      <td>
                        {lead.firstName} {lead.lastName}
                      </td>
                      <td>{lead.email}</td>
                      <td>{lead.phone}</td>
                      <td>{lead.message || "-"}</td>
                      <td>
                        {new Date(lead.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => deleteLead(lead._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 📄 PAGINATION */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <nav>
                <ul className="pagination">
                  <li
                    className={`page-item ${
                      currentPage === 1 ? "disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                  </li>

                  {[...Array(totalPages)].map((_, i) => (
                    <li
                      key={i}
                      className={`page-item ${
                        currentPage === i + 1 ? "active" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(i + 1)}
                      >
                        {i + 1}
                      </button>
                    </li>
                  ))}

                  <li
                    className={`page-item ${
                      currentPage === totalPages ? "disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
