// "use client";
// import React, { useState } from "react";
// import { FaUser, FaChartPie, FaUsers, FaCogs, FaBell } from "react-icons/fa";
// import Link from "next/link";
// import Sidebar from "@/components/admin-panel/Sidebar";

// export default function Dashboard() {
//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

//   return (
//     <div className="d-flex">
//       {/* Sidebar */}
//       <Sidebar sidebarOpen={sidebarOpen} />

//       {/* Main content */}
//       <div
//         className="flex-grow-1"
//         style={{ marginLeft: sidebarOpen ? "220px" : "0", transition: "0.3s" }}
//       >
//         {/* Top navbar */}
//         <nav className="navbar navbar-expand-lg navbar-light bg-light px-4 admin-topbar">
//           <button
//             className="btn btn-outline-primary me-3"
//             onClick={toggleSidebar}
//           >
//             <img src="/assets/images/admin/indent-decrease.svg"></img>
//           </button>
//           <div className="ms-auto d-flex align-items-center">
//             <FaBell className="me-3" size={20} />
//             <div className="dropdown">
//               <button
//                 className="btn btn-secondary dropdown-toggle"
//                 type="button"
//                 id="profileDropdown"
//                 data-bs-toggle="dropdown"
//                 aria-expanded="false"
//               >
//                 Admin
//               </button>
//               <ul
//                 className="dropdown-menu dropdown-menu-end"
//                 aria-labelledby="profileDropdown"
//               >
//                 <li>
//                   <Link className="dropdown-item" href="#">
//                     Profile
//                   </Link>
//                 </li>
//                 <li>
//                   <Link className="dropdown-item" href="#">
//                     Logout
//                   </Link>
//                 </li>
//               </ul>
//             </div>
//           </div>
//         </nav>

//         {/* Dashboard content */}
//         <div className="container-fluid p-4">
//           <h1 className="mb-4">Dashboard Overview</h1>

//           {/* Stats cards */}
//           <div className="row mb-4">
//             <div className="col-md-3 mb-3">
//               <div className="card shadow-sm border-0">
//                 <div className="card-body">
//                   <h5 className="card-title">Total Users</h5>
//                   <h3>1,245</h3>
//                 </div>
//               </div>
//             </div>
//             <div className="col-md-3 mb-3">
//               <div className="card shadow-sm border-0">
//                 <div className="card-body">
//                   <h5 className="card-title">Active Partners</h5>
//                   <h3>345</h3>
//                 </div>
//               </div>
//             </div>
//             <div className="col-md-3 mb-3">
//               <div className="card shadow-sm border-0">
//                 <div className="card-body">
//                   <h5 className="card-title">New Signups</h5>
//                   <h3>67</h3>
//                 </div>
//               </div>
//             </div>
//             <div className="col-md-3 mb-3">
//               <div className="card shadow-sm border-0">
//                 <div className="card-body">
//                   <h5 className="card-title">Revenue</h5>
//                   <h3>$12,450</h3>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Charts or detailed sections */}
//           <div className="row">
//             <div className="col-lg-8 mb-4">
//               <div className="card shadow-sm border-0">
//                 <div className="card-body">
//                   <h5 className="card-title">User Growth</h5>
//                   <div
//                     className="chart-placeholder"
//                     style={{
//                       height: "300px",
//                       background: "#f1f1f1",
//                       borderRadius: "5px",
//                     }}
//                   >
//                     {/* You can replace this with a chart library like Chart.js or Recharts */}
//                     <p className="text-center pt-5">Chart goes here</p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             <div className="col-lg-4 mb-4">
//               <div className="card shadow-sm border-0">
//                 <div className="card-body">
//                   <h5 className="card-title">Recent Activity</h5>
//                   <ul className="list-group list-group-flush">
//                     <li className="list-group-item">User John signed up</li>
//                     <li className="list-group-item">Partner ABC approved</li>
//                     <li className="list-group-item">New invoice generated</li>
//                     <li className="list-group-item">Settings updated</li>
//                   </ul>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }










"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "@/components/admin-panel/Sidebar";
import { FaBell } from "react-icons/fa";
import Link from "next/link";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState(null);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  useEffect(() => {
    fetch("/api/admin/dashboard-stats")
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  if (!stats) return <div className="p-4">Loading...</div>;

  return (
    <div className="admin-dashboard-v2 d-flex">
      <Sidebar sidebarOpen={sidebarOpen} />

      <div
        className="main-area"
 
      >
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
          <h2 className="dashboard-main-h">Dashboard Overview</h2>

          {/* CARDS */}
          <div className="row dashboard-cards">
            
            {/* CARD: Total Customers */}
            <div className="col-md-3 mb-3">
              <div className="stats-card">
                <div className="top-row">
                  <span>Total Customer</span>
                  <span className="arrow"><img src="/assets/images/admin/arrow-up-right.svg"></img></span>

                </div>
                <div className="value">{stats.totalCustomers}</div>
              </div>
            </div>

            {/* New Signups */}
            <div className="col-md-3 mb-3">
              <div className="stats-card">
                <div className="top-row">
                  <span>New Signups</span>
                  <span className="arrow"><img src="/assets/images/admin/arrow-up-right.svg"></img></span>

                </div>
                <div className="value">{stats.newSignups}</div>
              </div>
            </div>

            {/* Active Partners */}
            <div className="col-md-3 mb-3">
              <div className="stats-card">
                <div className="top-row">
                  <span>Active Partners</span>
                  <span className="arrow"><img src="/assets/images/admin/arrow-up-right.svg"></img></span>

                </div>
                <div className="value">{stats.totalPartners}</div>
              </div>
            </div>

            {/* Total Transactions */}
        <div className="col-md-3 mb-3">
          <div className="stats-card">
            <div className="top-row">
              <span>Contact Leads</span>
              <span className="arrow">
                <img src="/assets/images/admin/arrow-up-right.svg" />
              </span>
            </div>
            <div className="value">{stats.contactLeads}</div>
          </div>
        </div>


            {/* Total Products */}
            <div className="col-md-3 mb-3">
              <div className="stats-card">
                <div className="top-row">
                  <span>Total Products</span>
                  <span className="arrow"><img src="/assets/images/admin/arrow-up-right.svg"></img></span>

                </div>
                <div className="value">{stats.totalProducts}</div>
              </div>
            </div>

            {/* Pending Orders */}
            <div className="col-md-3 mb-3">
              <div className="stats-card">
                <div className="top-row">
                  <span>Pending Orders</span>
                  <span className="arrow"><img src="/assets/images/admin/arrow-up-right.svg"></img></span>

                </div>
                <div className="value">{stats.pendingOrders}</div>
              </div>
            </div>

            {/* Total Revenue */}
            {/* <div className="col-md-3 mb-3">
              <div className="stats-card highlight-card">
                <div className="top-row">
                  <span>Total Revenue</span>
                  <span className="arrow"><img src="/assets/images/admin/arrow-up-right.svg"></img></span>

                </div>
                <div className="value">₹{stats.totalRevenue.toFixed(2)}</div>
              </div>
            </div> */}
          </div>

          {/* RECENT ORDERS TABLE */}
        
        {/* RECENT ORDERS TABLE */}
<div className="card mt-4 shadow-sm recent-orders-card">
  <div className="card-body">
    <h5 className="mb-3 fw-bold">Recent Orders</h5>
    <table className="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>CUSTOMER</th>
          <th>CUSTOMER TYPE</th> {/* NEW */}
          <th>STATUS</th>
          <th>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        {stats.recentOrders.map(order => {

          // Detect B2B / B2C
          let customerType = "N/A";
          if (order.user?.userType === "partner") customerType = "B2B";
          if (order.user?.userType === "customer") customerType = "B2C";

          return (
            <tr key={order._id}>
              <td>#{order.orderNumber}</td>
              <td>{order.user?.name}</td>

              <td>
                <span className="badge bg-primary">
                  {customerType}
                </span>
              </td>

              <td>
                <span className={`status-pill ${order.status.toLowerCase()}`}>
                  {order.status}
                </span>
              </td>

              <td>₹{order.total}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</div>



        </div>
       </div>
      </div>
    </div>
  );
}
