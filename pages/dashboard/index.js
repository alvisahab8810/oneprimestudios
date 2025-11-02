"use client";
import React, { useState } from "react";
import { FaUser, FaChartPie, FaUsers, FaCogs, FaBell } from "react-icons/fa";
import Link from "next/link";
import Sidebar from "@/components/admin-panel/Sidebar";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

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
          <h1 className="mb-4">Dashboard Overview</h1>

          {/* Stats cards */}
          <div className="row mb-4">
            <div className="col-md-3 mb-3">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h5 className="card-title">Total Users</h5>
                  <h3>1,245</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h5 className="card-title">Active Partners</h5>
                  <h3>345</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h5 className="card-title">New Signups</h5>
                  <h3>67</h3>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-3">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h5 className="card-title">Revenue</h5>
                  <h3>$12,450</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Charts or detailed sections */}
          <div className="row">
            <div className="col-lg-8 mb-4">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h5 className="card-title">User Growth</h5>
                  <div
                    className="chart-placeholder"
                    style={{
                      height: "300px",
                      background: "#f1f1f1",
                      borderRadius: "5px",
                    }}
                  >
                    {/* You can replace this with a chart library like Chart.js or Recharts */}
                    <p className="text-center pt-5">Chart goes here</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4 mb-4">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h5 className="card-title">Recent Activity</h5>
                  <ul className="list-group list-group-flush">
                    <li className="list-group-item">User John signed up</li>
                    <li className="list-group-item">Partner ABC approved</li>
                    <li className="list-group-item">New invoice generated</li>
                    <li className="list-group-item">Settings updated</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
