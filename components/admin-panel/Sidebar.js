// "use client";
// import React, { useState } from "react";
// import Link from "next/link";
// import { FaChartPie, FaUsers, FaUser, FaCogs, FaBoxOpen, FaChevronDown } from "react-icons/fa";

// export default function Sidebar({ sidebarOpen }) {
//   const [productsOpen, setProductsOpen] = useState(false);

//   const toggleProducts = () => setProductsOpen(!productsOpen);

//   return (
//     <aside
//       className={`bg-dark text-white vh-100 p-3 position-fixed ${
//         sidebarOpen ? "d-block" : "d-none"
//       }`}
//       style={{ width: "220px", transition: "0.3s" }}
//     >
//       <div className="d-flex flex-column align-items-start">
//         {/* Logo */}
//         <Link className="navbar-brand d-flex align-items-center mb-4" href="/">
//           <img
//             src="/assets/images/logo.png"
//             alt="Logo"
//             className="me-2"
//           />
//         </Link>

//         {/* Dashboard */}
//         <Link href="/dashboard" className="text-white mb-3 d-flex align-items-center">
//           <img src="/assets/images/admin/home.svg" className="me-2" /> Dashboard
//         </Link>

//         {/* Users */}
//         <Link href="/dashboard/admin/orders" className="text-white mb-3 d-flex align-items-center">
//           <img src="/assets/images/admin/order.svg" className="me-2" /> Order Managment
//         </Link>

//         {/* Partners */}
//         <Link href="/dashboard/admin/partners" className="text-white mb-3 d-flex align-items-center">
//           <img src="/assets/images/admin/partner.svg" className="me-2" /> Partners
//         </Link>

//         {/* Products Dropdown */}
//         {/* <div className="mb-3">
//           <button
//             className="btn btn-dark w-100 d-flex justify-content-between align-items-center text-white"
//             onClick={toggleProducts}
//             style={{ border: "none", padding: "0" }}
//           >
//             <span className="d-flex align-items-center">
//               <FaBoxOpen className="me-2" /> Products
//             </span>
//             <FaChevronDown />
//           </button>
//           {productsOpen && (
//             <div className="ms-3 mt-2 d-flex flex-column">
//               <Link href="/dashboard/admin/add-product" className="text-white mb-2">
//                 Add New Product
//               </Link>
//               <Link href="/dashboard/admin/products" className="text-white">
//                 Product List
//               </Link>
//             </div>
//           )}
//         </div> */}


//         {/* Partners */}
//         <Link href="#" className="text-white mb-3 d-flex align-items-center">
//           Products
//         </Link>

//          {/* Orders */}
//         <Link href="/dashboard/admin/add-product" className="text-white mb-3 d-flex align-items-center">
//           <img src="/assets/images/admin/add-order.svg" className="me-2" /> Add Product
//         </Link>

//           <Link href="/dashboard/admin/products" className="text-white mb-3 d-flex align-items-center">
//           <img src="/assets/images/admin/product-list.svg" className="me-2" /> Product List
                
//           </Link>

//         {/* Settings */}
//         <Link href="#" className="text-white mb-3 d-flex align-items-center">
//           <FaCogs className="me-2" /> Settings
//         </Link>
//       </div>
//     </aside>
//   );
// }


"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({ sidebarOpen }) {
  const pathname = usePathname();

  const isActive = (route) => pathname === route;

  return (
    <aside className={`ops-admin-sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="ops-sidebar-inner">

        {/* Logo */}
        <Link href="/" className="ops-logo">
          <img src="/assets/images/logo.png" alt="Logo" />
        </Link>
        
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={`ops-item ${isActive("/dashboard") ? "active" : ""}`}
        >
          <img src="/assets/images/admin/home1.svg" /> Dashboard
        </Link>

        {/* Order Management */}
        <Link
          href="/dashboard/admin/orders"
          className={`ops-item ${isActive("/dashboard/admin/orders") ? "active" : ""}`}
        >
          <img src="/assets/images/admin/order.svg" /> Order Management
        </Link>

        {/* Partners */}
        <Link
          href="/dashboard/admin/partners"
          className={`ops-item ${isActive("/dashboard/admin/partners") ? "active" : ""}`}
        >
          <img src="/assets/images/admin/partner.svg" /> Partners
        </Link>


        {/* Customers */}
        <Link
          href="/dashboard/admin/customers"
          className={`ops-item ${isActive("/dashboard/admin/customers") ? "active" : ""}`}
        >
          <img src="/assets/images/admin/partner.svg" /> Customers
        </Link>

        

          {/* Partners */}
        <Link
          href="/dashboard/admin/categories"
          className={`ops-item ${isActive("/dashboard/admin/categories") ? "active" : ""}`}
        >
          <img src="/assets/images/admin/partner.svg" /> Add Category
        </Link>


        <Link
          href="/dashboard/admin/leads"
          className={`ops-item ${isActive("/dashboard/admin/leads") ? "active" : ""}`}
        >
          <img src="/assets/images/admin/partner.svg" /> Contact Leads
        </Link>

        {/* Section Label */}
        <span className="ops-section-title">PRODUCTS</span>

        {/* Add Product */}
        <Link
          href="/dashboard/admin/add-product"
          className={`ops-item ${isActive("/dashboard/admin/add-product") ? "active" : ""}`}
        >
          <img src="/assets/images/admin/add-order.svg" /> Add Products
        </Link>

        {/* Product List */}
        <Link
          href="/dashboard/admin/products"
          className={`ops-item ${isActive("/dashboard/admin/products") ? "active" : ""}`}
        >
          <img src="/assets/images/admin/product-list.svg" /> Product List
        </Link>

      </div>
    </aside>
  );
}
