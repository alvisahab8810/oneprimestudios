"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

import { FaBell } from "react-icons/fa";
import Link from "next/link";
import Sidebar from "@/components/admin-panel/Sidebar";

export default function B2CUsersPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get("/api/admin/get-customers");
      setCustomers(res.data);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.phone.includes(term)
    );
  });

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
          <button className="btn btn-outline-primary me-3" onClick={toggleSidebar}>
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

        {/* Page content */}
        <div className="container-fluid p-4">
          <h1 className="dashboard-main-h">B2C Customers</h1>

          {/* Search */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <table className="table table-bordered table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Signup Date</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center">
                    No customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer._id}>
                    <td>{customer.name}</td>
                    <td>{customer.email}</td>
                    <td>{customer.phone}</td>
                    <td>
                      {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
