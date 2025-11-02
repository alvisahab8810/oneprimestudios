"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

import { FaUser, FaChartPie, FaUsers, FaCogs, FaBell } from "react-icons/fa";
import Link from "next/link";
import Sidebar from "@/components/admin-panel/Sidebar";

export default function PartnerApprovalPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState([]); // ✅ track which partner is updating

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
        className="flex-grow-1"
        style={{ marginLeft: sidebarOpen ? "220px" : "0", transition: "0.3s" }}
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
          <h1 className="mb-4">Partner Approvals</h1>
          <div className="partner-approval-area">

            <table className="table table-bordered table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
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
                  partners.map((partner) => {
                    const isUpdating = updatingIds.includes(partner._id);

                    return (
                      <tr key={partner._id}>
                        <td>{partner.name}</td>
                        <td>{partner.companyName || "-"}</td>
                        <td>{partner.email}</td>
                        <td>{partner.phone}</td>
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
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
