// "use client";

// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import Sidebar from "@/components/admin-panel/Sidebar";
// import * as XLSX from "xlsx";
// import { FaChartLine, FaSearch, FaDownload } from "react-icons/fa";

// export default function PartnerSalesReport() {
//   const [sidebarOpen, setSidebarOpen] = useState(true);
// const router = useRouter();
//   const ITEMS_PER_PAGE = 8;
//   const [currentPage, setCurrentPage] = useState(1);

//   const [data, setData] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // 🔍 Filters
//   const [from, setFrom] = useState("");
//   const [to, setTo] = useState("");
//   const [search, setSearch] = useState("");

//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

//   useEffect(() => {
//     // ⛔ prevent API call on first render
//     if (!from && !to) return;

//     loadReport();
//   }, [from, to]);

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [from, to, search]);

//   // =========================
//   // FETCH REPORT
//   // =========================
//   const loadReport = async () => {
//     try {
//       setLoading(true);
//       const res = await axios.get(
//         `/api/admin/reports/partner-sales?from=${from}&to=${to}`,
//         { withCredentials: true },
//       );

//       setData(res.data.partners || []);
//     } catch (err) {
//       alert("Failed to load sales report");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadReport();
//   }, []);

//   // =========================
//   // FILTERED DATA (SEARCH)
//   // =========================
//   const filteredData = data.filter((p) => {
//     const q = search.toLowerCase();
//     return (
//       p.name?.toLowerCase().includes(q) ||
//       p.companyName?.toLowerCase().includes(q) ||
//       p.memberId?.toLowerCase().includes(q)
//     );
//   });

//   const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

//   const paginatedData = filteredData.slice(
//     (currentPage - 1) * ITEMS_PER_PAGE,
//     currentPage * ITEMS_PER_PAGE,
//   );

//   // =========================
//   // EXPORT EXCEL
//   // =========================
//   const exportExcel = () => {
//     const ws = XLSX.utils.json_to_sheet(
//       filteredData.map((p, index) => ({
//         Rank: index + 1,
//         Partner: p.name,
//         Company: p.companyName || "",
//         MemberID: p.memberId || "",
//         TotalOrders: p.totalOrders,
//         TotalSales: p.totalSales,
//       })),
//     );

//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Partner Sales");
//     XLSX.writeFile(wb, "partner-sales-report.xlsx");
//   };

//   // =========================
//   // UI
//   // =========================
//   return (
//     <div className="d-flex bg-light min-vh-100">
//       <Sidebar sidebarOpen={sidebarOpen} />

//       <div className="main-area">
//         {/* ================= TOPBAR ================= */}
//         <nav className="navbar navbar-expand-lg navbar-light bg-white px-4 shadow-sm sticky-top">
//           <button
//             className="btn btn-outline-primary me-3"
//             onClick={toggleSidebar}
//           >
//             ☰
//           </button>

//           <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
//             <FaChartLine />
//             Partner Sales Report
//           </h5>
//         </nav>

//         {/* ================= CONTENT ================= */}
//         <div className="container-fluid p-4">
//           {/* FILTER BAR */}
//           <div className="card p-3 mb-4 shadow-sm">
//             <div className="row g-3 align-items-end">
//               <div className="col-md-3">
//                 <label className="form-label">From Date</label>
//                 <input
//                   type="date"
//                   className="form-control"
//                   value={from}
//                   onChange={(e) => setFrom(e.target.value)}
//                 />
//               </div>

//               <div className="col-md-3">
//                 <label className="form-label">To Date</label>
//                 <input
//                   type="date"
//                   className="form-control"
//                   value={to}
//                   onChange={(e) => setTo(e.target.value)}
//                 />
//               </div>

//               <div className="col-md-4">
//                 <label className="form-label">Search Partner</label>
//                 <input
//                   type="text"
//                   className="form-control"
//                   placeholder="Name / Company / Member ID"
//                   value={search}
//                   onChange={(e) => setSearch(e.target.value)}
//                 />
//               </div>

//               <div className="col-md-2">
//                 <button className="btn btn-success w-100" onClick={exportExcel}>
//                   Export
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* PERFORMANCE CARDS */}
//           {loading ? (
//             <div className="text-center py-5 fw-semibold">Loading report…</div>
//           ) : (
//             <div className="row">
//               {paginatedData.map((p, index) => {
//                 const globalRank =
//                   (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

//                 return (
//                   <div className="col-xl-3 col-lg-4 col-md-6 mb-4" key={p._id}>
//                     <div className="card shadow-sm h-100">
//                       <div className="card-body">
//                         <span className="badge bg-dark mb-2">
//                           Rank #{globalRank}
//                         </span>

//                         <h5 className="fw-bold mb-1">{p.name}</h5>
//                         <p className="small text-muted">
//                           {p.companyName || "—"}
//                         </p>

//                         <hr />

//                         <div className="d-flex justify-content-between">
//                           <span>Total Orders</span>
//                           <strong>{p.totalOrders}</strong>
//                         </div>

//                         <div className="d-flex justify-content-between mt-2">
//                           <span>Total Sales</span>
//                           <strong className="text-success">
//                             ₹{p.totalSales.toLocaleString("en-IN")}
//                           </strong>
//                         </div>
//                       </div>
//                     </div>

                   
//                   </div>
//                 );
//               })}

//               {filteredData.length === 0 && (
//                 <div className="text-center text-muted py-5">
//                   No partner sales found
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//          {totalPages > 1 && (
//                       <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
//                         <button
//                           className="btn btn-outline-secondary"
//                           disabled={currentPage === 1}
//                           onClick={() => setCurrentPage((p) => p - 1)}
//                         >
//                           ← Previous
//                         </button>

//                         <span className="fw-semibold">
//                           Page {currentPage} of {totalPages}
//                         </span>

//                         <button
//                           className="btn btn-outline-secondary"
//                           disabled={currentPage === totalPages}
//                           onClick={() => setCurrentPage((p) => p + 1)}
//                         >
//                           Next →
//                         </button>
//                       </div>
//                     )}
//       </div>
//     </div>
//   );
// }




"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import * as XLSX from "xlsx";
import { FaChartLine, FaSearch, FaDownload } from "react-icons/fa";

export default function PartnerSalesReport() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
const router = useRouter();
  const ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔍 Filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    // ⛔ prevent API call on first render
    if (!from && !to) return;

    loadReport();
  }, [from, to]);

  useEffect(() => {
    setCurrentPage(1);
  }, [from, to, search]);

  // =========================
  // FETCH REPORT
  // =========================
  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `/api/admin/reports/partner-sales?from=${from}&to=${to}`,
        { withCredentials: true },
      );

      setData(res.data.partners || []);
    } catch (err) {
      alert("Failed to load sales report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  // =========================
  // FILTERED DATA (SEARCH)
  // =========================
  const filteredData = data.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.companyName?.toLowerCase().includes(q) ||
      p.memberId?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // =========================
  // EXPORT EXCEL
  // =========================
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredData.map((p, index) => ({
        Rank: index + 1,
        Partner: p.name,
        Company: p.companyName || "",
        MemberID: p.memberId || "",
        TotalOrders: p.totalOrders,
        TotalSales: p.totalSales,
      })),
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Partner Sales");
    XLSX.writeFile(wb, "partner-sales-report.xlsx");
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="d-flex bg-light min-vh-100">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        {/* ================= TOPBAR ================= */}
        <nav className="navbar navbar-expand-lg navbar-light bg-white px-4 shadow-sm sticky-top">
          <button
            className="btn btn-outline-primary me-3"
            onClick={toggleSidebar}
          >
            ☰
          </button>

          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <FaChartLine />
            Partner Sales Report
          </h5>
        </nav>

        {/* ================= CONTENT ================= */}
        <div className="container-fluid p-4">
          {/* FILTER BAR */}
          <div className="card p-3 mb-4 shadow-sm">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label">From Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">To Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label">Search Partner</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Name / Company / Member ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="col-md-2">
                <button className="btn btn-success w-100" onClick={exportExcel}>
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* PERFORMANCE CARDS */}
          {loading ? (
            <div className="text-center py-5 fw-semibold">Loading report…</div>
          ) : (
            <div className="row">
              {paginatedData.map((p, index) => {
                const globalRank =
                  (currentPage - 1) * ITEMS_PER_PAGE + index + 1;

                return (
                  <div className="col-xl-3 col-lg-4 col-md-6 mb-4" key={p._id}>
                  <div
  className="card shadow-sm h-100 cursor-pointer"
  style={{ cursor: "pointer" }}
  onClick={() =>
    router.push(
      `/dashboard/admin/reports/partner-sales/${p._id}`
    )
  }
>

                      <div className="card-body">
                        <span className="badge bg-dark mb-2">
                          Rank #{globalRank}
                        </span>

                        <h5 className="fw-bold mb-1">{p.name}</h5>
                        <p className="small text-muted">
                          {p.companyName || "—"}
                        </p>

                        <hr />

                        <div className="d-flex justify-content-between">
                          <span>Total Orders</span>
                          <strong>{p.totalOrders}</strong>
                        </div>

                        <div className="d-flex justify-content-between mt-2">
                          <span>Total Sales</span>
                          <strong className="text-success">
                            ₹{p.totalSales.toLocaleString("en-IN")}
                          </strong>
                        </div>
                      </div>
                    </div>

                   
                  </div>
                );
              })}

              {filteredData.length === 0 && (
                <div className="text-center text-muted py-5">
                  No partner sales found
                </div>
              )}
            </div>
          )}
        </div>

         {totalPages > 1 && (
                      <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                        <button
                          className="btn btn-outline-secondary"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => p - 1)}
                        >
                          ← Previous
                        </button>

                        <span className="fw-semibold">
                          Page {currentPage} of {totalPages}
                        </span>

                        <button
                          className="btn btn-outline-secondary"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => p + 1)}
                        >
                          Next →
                        </button>
                      </div>
                    )}
      </div>
    </div>
  );
}
