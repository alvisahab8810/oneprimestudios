


// "use client";
// import React from "react";
// import Link from "next/link";
// import { FaTruck } from "react-icons/fa";

// import { FaHandshake } from "react-icons/fa";
// import { FaUserPlus, FaChartLine } from "react-icons/fa";
// import { FaTags } from "react-icons/fa";




// import { usePathname } from "next/navigation";

// export default function Sidebar({ sidebarOpen }) {
//   const pathname = usePathname();

//   const isActive = (route) => pathname === route;

//   return (
//     <aside className={`ops-admin-sidebar ${sidebarOpen ? "open" : ""}`}>
//       <div className="ops-sidebar-inner">

//         {/* Logo */}
//         <Link href="/" className="ops-logo">
//           <img src="/assets/images/logo.png" alt="Logo" />
//         </Link>
        
//         {/* Dashboard */}
//         <Link
//           href="/dashboard"
//           className={`ops-item ${isActive("/dashboard") ? "active" : ""}`}
//         >
//           <img src="/assets/images/admin/home1.svg" /> Dashboard
//         </Link>

//         {/* Order Management */}
//         <Link
//           href="/dashboard/admin/orders"
//           className={`ops-item ${isActive("/dashboard/admin/orders") ? "active" : ""}`}
//         >
//           <img src="/assets/images/admin/order.svg" /> Order Management
//         </Link>

//         {/* Partners */}
//         <Link
//           href="/dashboard/admin/partners"
//           className={`ops-item ${isActive("/dashboard/admin/partners") ? "active" : ""}`}
//         >
//           <FaHandshake className="me-2" /> Partners
//         </Link>


//         {/* Customers */}
//         <Link
//           href="/dashboard/admin/customers"
//           className={`ops-item ${isActive("/dashboard/admin/customers") ? "active" : ""}`}
//         >
//           <img src="/assets/images/admin/partner.svg" /> Customers
//         </Link>



//            {/* Customers */}
//         <Link
//           href="/dashboard/admin/dispatch-requests"
//           className={`ops-item ${isActive("/dashboard/admin/dispatch-requests") ? "active" : ""}`}
//         >
//             <FaTruck className="me-2" /> Dispatched Requests
//         </Link>

        

//           {/* Partners */}
//         <Link
//           href="/dashboard/admin/categories"
//           className={`ops-item ${isActive("/dashboard/admin/categories") ? "active" : ""}`}
//         >
//           <img src="/assets/images/admin/add-order.svg" /> Add Category
//         </Link>


//         <Link
//           href="/dashboard/admin/leads"
//           className={`ops-item ${isActive("/dashboard/admin/leads") ? "active" : ""}`}
//         >
//           <FaUserPlus className="me-2" /> Leads
//         </Link>

//         <Link
//           href="/dashboard/admin/reports/partner-sales"
//           className={`ops-item ${isActive("/dashboard/admin/reports/partner-sales") ? "active" : ""}`}
//         >
//           <FaChartLine className="me-2" /> Partner Sales Report
//         </Link>

//         {/* Section Label */}
//         <span className="ops-section-title">PRODUCTS</span>

//         {/* Add Product */}
//         <Link
//           href="/dashboard/admin/add-product"
//           className={`ops-item ${isActive("/dashboard/admin/add-product") ? "active" : ""}`}
//         >
//           <img src="/assets/images/admin/add-order.svg" /> Add Products
//         </Link>

//         {/* Product List */}
//         <Link
//           href="/dashboard/admin/products"
//           className={`ops-item ${isActive("/dashboard/admin/products") ? "active" : ""}`}
//         >
//           <img src="/assets/images/admin/product-list.svg" /> Product List
//         </Link>


//              {/* Add Product */}
//         <Link
//           href="/dashboard/admin/coupons"
//           className={`ops-item ${isActive("/dashboard/admin/coupons") ? "active" : ""}`}
//         >
//           <FaTags className="me-2" /> Coupons
//         </Link>

//       </div>
//     </aside>
//   );

// }



"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";

import {
  FaTruck,
  FaHandshake,
  FaUserPlus,
  FaChartLine,
  FaTags,
  FaFileInvoice ,
} from "react-icons/fa";

import { canAccess } from "@/lib/canAccess";

export default function Sidebar({ sidebarOpen }) {
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  const isActive = (route) => pathname === route;

  // 🔐 Fetch logged-in user (role + permissions)
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/admin/me", {
          credentials: "include",
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        setUser(data);
      } catch {
        toast.error("Session expired");
        window.location.href = "/dashboard/admin/login";
      }
    };

    fetchMe();
  }, []);

  if (!user) return null; // prevent flicker

  return (
    <aside className={`ops-admin-sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="ops-sidebar-inner">

        {/* Logo */}
        <Link href="/" className="ops-logo">
          <img src="/assets/images/logo.png" alt="Logo" />
        </Link>

        {/* ================= DASHBOARD ================= */}
        {canAccess(user, "dashboard") && (
          <Link
            href={
              user.role === "manager"
                ? "/dashboard/manager"
                : user.role === "designer"
                ? "/dashboard/designer"
                : user.role === "product_manager"
                ? "/dashboard/product-manager"
                : "/dashboard"
            }
            className={`ops-item ${
              pathname === "/dashboard" ||
              pathname === "/dashboard/manager" ||
              pathname === "/dashboard/designer" ||
              pathname === "/dashboard/product-manager"
                ? "active"
                : ""
            }`}
          >
            <img src="/assets/images/admin/home1.svg" /> Dashboard
          </Link>
        )}

        {/* ================= ORDER MANAGEMENT ================= */}
        {canAccess(user, "orders") && (
          <Link
            href="/dashboard/admin/orders"
            className={`ops-item ${
              isActive("/dashboard/admin/orders") ? "active" : ""
            }`}
          >
            <img src="/assets/images/admin/order.svg" /> Order Management
          </Link>
        )}

        {/* ================= PARTNERS ================= */}
        {canAccess(user, "partners") && (
          <Link
            href="/dashboard/admin/partners"
            className={`ops-item ${
              isActive("/dashboard/admin/partners") ? "active" : ""
            }`}
          >
            <FaHandshake className="me-2" /> Partners
          </Link>
        )}

        {/* ================= CUSTOMERS ================= */}
        {canAccess(user, "customers") && (
          <Link
            href="/dashboard/admin/customers"
            className={`ops-item ${
              isActive("/dashboard/admin/customers") ? "active" : ""
            }`}
          >
            <img src="/assets/images/admin/partner.svg" /> Customers
          </Link>
        )}

        {/* ================= DISPATCH REQUESTS ================= */}
        {canAccess(user, "dispatch_requests") && (
          <Link
            href="/dashboard/admin/dispatch-requests"
            className={`ops-item ${
              isActive("/dashboard/admin/dispatch-requests") ? "active" : ""
            }`}
          >
            <FaTruck className="me-2" /> Dispatched Requests
          </Link>
        )}

        {/* ================= CATEGORIES ================= */}
        {canAccess(user, "categories") && (
          <Link
            href="/dashboard/admin/categories"
            className={`ops-item ${
              isActive("/dashboard/admin/categories") ? "active" : ""
            }`}
          >
            <img src="/assets/images/admin/add-order.svg" /> Add Category
          </Link>
        )}

        {/* ================= LEADS ================= */}
        {canAccess(user, "leads") && (
          <Link
            href="/dashboard/admin/leads"
            className={`ops-item ${
              isActive("/dashboard/admin/leads") ? "active" : ""
            }`}
          >
            <FaUserPlus className="me-2" /> Leads
          </Link>
        )}

        {/* ================= REPORTS ================= */}
        {canAccess(user, "reports.partner_sales") && (
          <Link
            href="/dashboard/admin/reports/partner-sales"
            className={`ops-item ${
              isActive("/dashboard/admin/reports/partner-sales")
                ? "active"
                : ""
            }`}
          >
            <FaChartLine className="me-2" /> Partner Sales Report
          </Link>
        )}


          {/* ================= Invoices ================= */}
        {canAccess(user, "invoices") && (
          <Link
            href="/dashboard/admin/invoices/"
            className={`ops-item ${
              isActive("/dashboard/admin/invoices/")
                ? "active"
                : ""
            }`}
          >
            <FaFileInvoice  className="me-2" /> Create Invoice
          </Link>
        )}

        {/* ================= PRODUCTS ================= */}
        {canAccess(user, "products") && (
          <>
            <span className="ops-section-title">PRODUCTS</span>

            <Link
              href="/dashboard/admin/add-product"
              className={`ops-item ${
                isActive("/dashboard/admin/add-product") ? "active" : ""
              }`}
            >
              <img src="/assets/images/admin/add-order.svg" /> Add Products
            </Link>

            <Link
              href="/dashboard/admin/products"
              className={`ops-item ${
                isActive("/dashboard/admin/products") ? "active" : ""
              }`}
            >
              <img src="/assets/images/admin/product-list.svg" /> Product List
            </Link>
          </>
        )}

        {/* ================= COUPONS ================= */}
        {canAccess(user, "coupons") && (
          <Link
            href="/dashboard/admin/coupons"
            className={`ops-item ${
              isActive("/dashboard/admin/coupons") ? "active" : ""
            }`}
          >
            <FaTags className="me-2" /> Coupons
          </Link>
        )}



         {canAccess(user, "OPS Users") && (
          <Link
            href="/dashboard/admin/users"
            className={`ops-item ${
              isActive("/dashboard/admin/users") ? "active" : ""
            }`}
          >
            <img src="/assets/images/admin/partner.svg" /> OPS Users
          </Link>
        )}

              {canAccess(user, "OPS Users") && (
          <Link
            href="/dashboard/admin/complaints"
            className={`ops-item ${
              isActive("/dashboard/admin/complaints") ? "active" : ""
            }`}
          >
            <img src="/assets/images/admin/partner.svg" /> complaint Requests
          </Link>
        )}

      </div>
    </aside>
  );
}
