"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Sidebar from "@/components/admin-panel/Sidebar";
import toast from "react-hot-toast";
import Link from "next/link";
import { FaBell } from "react-icons/fa";

export default function AdminLeads() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [leads, setLeads] = useState([]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const fetchLeads = async () => {
    try {
      const res = await axios.get("/api/contact/list");
      setLeads(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load leads");
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

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} />

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
          <h1 className="mb-4">Contact Leads</h1>

          <div className="table-responsive">
            <table className="table table-bordered align-middle">
              <thead className="table-light">
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
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-muted">
                      No leads found
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead._id}>
                      <td>{lead.firstName} {lead.lastName}</td>
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
        </div>

      </div>
    </div>
  );
}
