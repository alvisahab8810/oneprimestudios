"use client";
import React, { useState } from "react";
import Link from "next/link";
import { FaChartPie, FaUsers, FaUser, FaCogs, FaBoxOpen, FaChevronDown } from "react-icons/fa";

export default function Sidebar({ sidebarOpen }) {
  const [productsOpen, setProductsOpen] = useState(false);

  const toggleProducts = () => setProductsOpen(!productsOpen);

  return (
    <aside
      className={`bg-dark text-white vh-100 p-3 position-fixed ${
        sidebarOpen ? "d-block" : "d-none"
      }`}
      style={{ width: "220px", transition: "0.3s" }}
    >
      <div className="d-flex flex-column align-items-start">
        {/* Logo */}
        <Link className="navbar-brand d-flex align-items-center mb-4" href="/">
          <img
            src="/assets/images/logo.png"
            alt="Logo"
            className="me-2"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </Link>

        {/* Dashboard */}
        <Link href="/dashboard" className="text-white mb-3 d-flex align-items-center">
          <FaChartPie className="me-2" /> Dashboard
        </Link>

        {/* Users */}
        <Link href="#" className="text-white mb-3 d-flex align-items-center">
          <FaUsers className="me-2" /> Users
        </Link>

        {/* Partners */}
        <Link href="/dashboard/admin/partners" className="text-white mb-3 d-flex align-items-center">
          <FaUser className="me-2" /> Partners
        </Link>

        {/* Products Dropdown */}
        <div className="mb-3">
          <button
            className="btn btn-dark w-100 d-flex justify-content-between align-items-center text-white"
            onClick={toggleProducts}
            style={{ border: "none", padding: "0" }}
          >
            <span className="d-flex align-items-center">
              <FaBoxOpen className="me-2" /> Products
            </span>
            <FaChevronDown />
          </button>
          {productsOpen && (
            <div className="ms-3 mt-2 d-flex flex-column">
              <Link href="/dashboard/admin/add-product" className="text-white mb-2">
                Add New Product
              </Link>
              <Link href="/dashboard/admin/products" className="text-white">
                Product List
              </Link>
            </div>
          )}
        </div>

        {/* Settings */}
        <Link href="#" className="text-white mb-3 d-flex align-items-center">
          <FaCogs className="me-2" /> Settings
        </Link>
      </div>
    </aside>
  );
}
