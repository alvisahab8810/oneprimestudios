"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaBell } from "react-icons/fa";
import Link from "next/link";

export default function ManagerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState(null);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="admin-dashboard-v2 d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

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
              {/* <FaBell className="me-3" size={20} /> */}
              <div className="user-flow-icon">
                <img src="/assets/images/admin/profile.svg"></img>
              </div>
            </div>
          </nav>

          {/* CONTENT */}
          <div className="content-dashbord mt-2">
            <h2 className="dashboard-main-h">Manager Dashboard</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
