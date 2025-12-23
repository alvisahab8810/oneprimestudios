// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";
// import toast from "react-hot-toast";
// import Sidebar from "@/components/admin-panel/Sidebar";
// import { FaTags, FaToggleOn, FaToggleOff, FaPlus } from "react-icons/fa";
// import Link from "next/link";

// export default function AdminCoupons() {
//   const [sidebarOpen, setSidebarOpen] = useState(true);
//   const [coupons, setCoupons] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // filters
//   const [search, setSearch] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");

//   // pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const itemsPerPage = 10;

//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

//   const fetchCoupons = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get("/api/admin/coupons", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setCoupons(res.data);
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load coupons");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchCoupons();
//   }, []);

//   const toggleStatus = async (id, currentStatus) => {
//     try {
//       const token = localStorage.getItem("token");
//       await axios.put(
//         "/api/admin/coupons/update",
//         { id, isActive: !currentStatus },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       toast.success("Coupon status updated");

//       setCoupons((prev) =>
//         prev.map((c) =>
//           c._id === id ? { ...c, isActive: !currentStatus } : c
//         )
//       );
//     } catch {
//       toast.error("Failed to update coupon");
//     }
//   };

//   // 🔍 FILTER + SEARCH
//   const filteredCoupons = coupons.filter((c) => {
//     const matchSearch = c.code
//       .toLowerCase()
//       .includes(search.toLowerCase());

//     const matchStatus =
//       statusFilter === "all"
//         ? true
//         : statusFilter === "active"
//         ? c.isActive
//         : !c.isActive;

//     return matchSearch && matchStatus;
//   });

//   // 📄 PAGINATION
//   const indexOfLast = currentPage * itemsPerPage;
//   const indexOfFirst = indexOfLast - itemsPerPage;
//   const currentCoupons = filteredCoupons.slice(
//     indexOfFirst,
//     indexOfLast
//   );
//   const totalPages = Math.ceil(
//     filteredCoupons.length / itemsPerPage
//   );

//   if (loading) {
//     return <p className="text-center mt-5">Loading coupons...</p>;
//   }

//   return (
//     <div className="d-flex">
//       <Sidebar sidebarOpen={sidebarOpen} />

//       <div
//         className="main-area"
       
//       >
//         <div className="container-fluid p-4">
//           <div className="d-flex justify-content-between align-items-center mb-4">
//             <h1 className="dashboard-main-h">
//               <FaTags className="me-2" />
//               Coupons
//             </h1>

//             <Link
//               href="/dashboard/admin/coupons/create"
//               className="btn btn-primary"
//             >
//               <FaPlus className="me-2" />
//               Create Coupon
//             </Link>
//           </div>

//           {/* FILTER BAR */}
//           <div className="d-flex gap-3 mb-3 flex-wrap">
//             <input
//               type="text"
//               className="form-control w-auto"
//               placeholder="Search coupon code..."
//               value={search}
//               onChange={(e) => {
//                 setSearch(e.target.value);
//                 setCurrentPage(1);
//               }}
//               style={{ minWidth: "220px" }}
//             />

//             <select
//               className="form-select w-auto"
//               value={statusFilter}
//               onChange={(e) => {
//                 setStatusFilter(e.target.value);
//                 setCurrentPage(1);
//               }}
//             >
//               <option value="all">All</option>
//               <option value="active">Active</option>
//               <option value="inactive">Inactive</option>
//             </select>
//           </div>

//           <table className="table table-bordered table-hover align-middle">
//             <thead className="table-dark">
//               <tr>
//                 <th>Code</th>
//                 <th>Type</th>
//                 <th>Value</th>
//                 <th>Usage</th>
//                 <th>Expiry</th>
//                 <th>Status</th>
//               </tr>
//             </thead>
//             <tbody>
//               {currentCoupons.length === 0 ? (
//                 <tr>
//                   <td colSpan="6" className="text-center">
//                     No coupons found
//                   </td>
//                 </tr>
//               ) : (
//                 currentCoupons.map((coupon) => (
//                   <tr key={coupon._id}>
//                     <td>{coupon.code}</td>
//                     <td className="text-capitalize">
//                       {coupon.discountType}
//                     </td>
//                     <td>
//                       {coupon.discountType === "percentage"
//                         ? `${coupon.discountValue}%`
//                         : `₹${coupon.discountValue}`}
//                     </td>
//                     <td>
//                       {coupon.usedCount}
//                       {coupon.usageLimit
//                         ? ` / ${coupon.usageLimit}`
//                         : ""}
//                     </td>
//                     <td>
//                       {coupon.expiryDate
//                         ? new Date(
//                             coupon.expiryDate
//                           ).toLocaleDateString()
//                         : "-"}
//                     </td>
//                     <td>
//                       <button
//                         className="btn btn-sm"
//                         onClick={() =>
//                           toggleStatus(coupon._id, coupon.isActive)
//                         }
//                       >
//                         {coupon.isActive ? (
//                           <FaToggleOn
//                             size={22}
//                             className="text-success"
//                           />
//                         ) : (
//                           <FaToggleOff
//                             size={22}
//                             className="text-danger"
//                           />
//                         )}
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>

//           {/* PAGINATION */}
//           {totalPages > 1 && (
//             <div className="d-flex justify-content-center mt-3">
//               <ul className="pagination">
//                 <li
//                   className={`page-item ${
//                     currentPage === 1 ? "disabled" : ""
//                   }`}
//                 >
//                   <button
//                     className="page-link"
//                     onClick={() =>
//                       setCurrentPage((p) => p - 1)
//                     }
//                   >
//                     Previous
//                   </button>
//                 </li>

//                 {[...Array(totalPages)].map((_, i) => (
//                   <li
//                     key={i}
//                     className={`page-item ${
//                       currentPage === i + 1 ? "active" : ""
//                     }`}
//                   >
//                     <button
//                       className="page-link"
//                       onClick={() =>
//                         setCurrentPage(i + 1)
//                       }
//                     >
//                       {i + 1}
//                     </button>
//                   </li>
//                 ))}

//                 <li
//                   className={`page-item ${
//                     currentPage === totalPages
//                       ? "disabled"
//                       : ""
//                   }`}
//                 >
//                   <button
//                     className="page-link"
//                     onClick={() =>
//                       setCurrentPage((p) => p + 1)
//                     }
//                   >
//                     Next
//                   </button>
//                 </li>
//               </ul>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }



"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Sidebar from "@/components/admin-panel/Sidebar";
import {
  FaTags,
  FaToggleOn,
  FaToggleOff,
  FaPlus,
  FaTrash,
  FaEdit, // ✅ ADDED
} from "react-icons/fa";
import Link from "next/link";

export default function AdminCoupons() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ================== EDIT STATES (ADDED) ==================
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [saving, setSaving] = useState(false);
  // =========================================================

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // ================= FETCH =================
  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/admin/coupons", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCoupons(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // ================= TOGGLE STATUS =================
  const toggleStatus = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "/api/admin/coupons/update",
        { id, isActive: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Coupon status updated");

      setCoupons((prev) =>
        prev.map((c) =>
          c._id === id ? { ...c, isActive: !currentStatus } : c
        )
      );
    } catch {
      toast.error("Failed to update coupon");
    }
  };

  // ================= DELETE COUPON =================
  const deleteCoupon = async (coupon) => {
    if (coupon.usedCount > 0) {
      return toast.error("Cannot delete a coupon that has been used");
    }

    if (!confirm(`Delete coupon "${coupon.code}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete("/api/admin/coupons/delete", {
        headers: { Authorization: `Bearer ${token}` },
        data: { id: coupon._id },
      });

      toast.success("Coupon deleted");
      setCoupons((prev) =>
        prev.filter((c) => c._id !== coupon._id)
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Delete failed"
      );
    }
  };

  // ================= EDIT HANDLERS (ADDED) =================
  const openEditModal = (coupon) => {
    setEditingCoupon({
      ...coupon,
      expiryDate: coupon.expiryDate
        ? coupon.expiryDate.split("T")[0]
        : "",
    });
  };

  const closeEditModal = () => setEditingCoupon(null);

  const updateCoupon = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      await axios.put(
        "/api/admin/coupons/update",
        {
          id: editingCoupon._id,
          discountValue: editingCoupon.discountValue,
          minOrderAmount: editingCoupon.minOrderAmount,
          expiryDate: editingCoupon.expiryDate,
          perUserLimit: editingCoupon.perUserLimit,
          allowedUserTypes: editingCoupon.allowedUserTypes,
          isActive: editingCoupon.isActive,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Coupon updated");

      setCoupons((prev) =>
        prev.map((c) =>
          c._id === editingCoupon._id ? editingCoupon : c
        )
      );

      closeEditModal();
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };
  // =========================================================

  // ================= FILTER + SEARCH =================
  const filteredCoupons = coupons.filter((c) => {
    const matchSearch = c.code
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? c.isActive
        : !c.isActive;

    return matchSearch && matchStatus;
  });

  // ================= PAGINATION =================
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentCoupons = filteredCoupons.slice(
    indexOfFirst,
    indexOfLast
  );
  const totalPages = Math.ceil(
    filteredCoupons.length / itemsPerPage
  );

  // ================= BADGE =================
  const renderUsageBadge = (coupon) => {
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return <span className="badge bg-secondary">Expired</span>;
    }

    if (coupon.usedCount > 0) {
      return <span className="badge bg-warning text-dark">Used</span>;
    }

    return <span className="badge bg-success">Unused</span>;
  };

  if (loading) {
    return <p className="text-center mt-5">Loading coupons...</p>;
  }

  return (
    <div className="d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div className="main-area">
        <div className="container-fluid p-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="dashboard-main-h">
              <FaTags className="me-2" />
              Coupons
            </h1>

            <Link
              href="/dashboard/admin/coupons/create"
              className="btn btn-primary"
            >
              <FaPlus className="me-2" />
              Create Coupon
            </Link>
          </div>

          {/* FILTER BAR */}
          <div className="d-flex gap-3 mb-3 flex-wrap">
            <input
              type="text"
              className="form-control w-auto"
              placeholder="Search coupon code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ minWidth: "220px" }}
            />

            <select
              className="form-select w-auto"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <table className="table table-bordered table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Usage</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {currentCoupons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center">
                    No coupons found
                  </td>
                </tr>
              ) : (
                currentCoupons.map((coupon) => (
                  <tr key={coupon._id}>
                    <td>
                      <strong>{coupon.code}</strong>
                      <div className="mt-1">
                        {renderUsageBadge(coupon)}
                      </div>
                    </td>

                    <td className="text-capitalize">
                      {coupon.discountType}
                    </td>

                    <td>
                      {coupon.discountType === "percentage"
                        ? `${coupon.discountValue}%`
                        : `₹${coupon.discountValue}`}
                    </td>

                    <td>
                      {coupon.usedCount}
                    </td>

                    <td>
                      {coupon.expiryDate
                        ? new Date(coupon.expiryDate).toLocaleDateString()
                        : "-"}
                    </td>

                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() =>
                          toggleStatus(
                            coupon._id,
                            coupon.isActive
                          )
                        }
                      >
                        {coupon.isActive ? (
                          <FaToggleOn size={22} className="text-success" />
                        ) : (
                          <FaToggleOff size={22} className="text-danger" />
                        )}
                      </button>
                    </td>

                    <td className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => openEditModal(coupon)}
                      >
                        <FaEdit />
                      </button>

                      <button
                        className="btn btn-sm btn-danger"
                        disabled={coupon.usedCount > 0}
                        onClick={() => deleteCoupon(coupon)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-3">
              <ul className="pagination">
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
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ================= EDIT MODAL (ADDED) ================= */}
      {editingCoupon && (
        <div className="modal fade show d-block">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5>Edit Coupon — {editingCoupon.code}</h5>
                <button className="btn-close" onClick={closeEditModal} />
              </div>

              <div className="modal-body row g-3">
                <div className="col-md-6">
                  <label className="form-label">Coupon Code</label>
                  <input className="form-control" value={editingCoupon.code} disabled />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Discount Type</label>
                  <input className="form-control" value={editingCoupon.discountType} disabled />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Discount Value</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editingCoupon.discountValue}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        discountValue: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Minimum Order Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editingCoupon.minOrderAmount || ""}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        minOrderAmount: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={editingCoupon.expiryDate || ""}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        expiryDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Per User Limit</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editingCoupon.perUserLimit}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        perUserLimit: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="col-md-12">
                  <label className="form-label">Allowed User Types</label>
                  <div className="d-flex gap-4">
                    {["customer", "partner"].map((type) => (
                      <div key={type} className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={editingCoupon.allowedUserTypes?.includes(type)}
                          onChange={() =>
                            setEditingCoupon((prev) => ({
                              ...prev,
                              allowedUserTypes: prev.allowedUserTypes.includes(type)
                                ? prev.allowedUserTypes.filter((t) => t !== type)
                                : [...prev.allowedUserTypes, type],
                            }))
                          }
                        />
                        <label className="form-check-label text-capitalize">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-md-12 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={editingCoupon.isActive}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        isActive: e.target.checked,
                      })
                    }
                  />
                  <label className="form-check-label">
                    Coupon is Active
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeEditModal}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={updateCoupon} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
