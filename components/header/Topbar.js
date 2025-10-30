

// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import axios from "axios";

// export default function Topbar() {
//   const [user, setUser] = useState(null);
//   const [cartCount, setCartCount] = useState(0);

//   useEffect(() => {
//     const name = localStorage.getItem("name");
//     const userType = localStorage.getItem("userType");
//     if (name) setUser({ name, userType });

//     fetchCartCount();
//   }, []);

//   // ✅ Fetch total items in cart (not total quantity)
//   const fetchCartCount = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) return;

//     try {
//       const res = await axios.get("/api/cart", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       // Just count how many distinct items (not quantity)
//       setCartCount(res.data.length || 0);
//     } catch (err) {
//       console.error("Failed to load cart count:", err);
//       setCartCount(0);
//     }
//   };

//   const handleLogout = () => {
//     localStorage.clear();
//     setUser(null);
//     window.location.href = "/login";
//   };

//   return (
//     <nav className="main-nav navbar navbar-expand-lg bg-white">
//       <div className="container-fluid">
//         <Link className="navbar-brand d-flex align-items-center" href="/">
//           <img src="/assets/images/logo.png" alt="Logo" className="me-2" />
//         </Link>

//         <button
//           className="navbar-toggler"
//           type="button"
//           data-bs-toggle="collapse"
//           data-bs-target="#navbarNav"
//           aria-controls="navbarNav"
//           aria-expanded="false"
//           aria-label="Toggle navigation"
//         >
//           <span className="navbar-toggler-icon"></span>
//         </button>

//         <div
//           className="collapse navbar-collapse justify-content-center"
//           id="navbarNav"
//         ></div>

//         <div className="right-side">
//           <ul className="navbar-nav gap-3">
//             <li className="nav-item">
//               <Link className="nav-link" href="/">
//                 Home
//               </Link>
//             </li>
//             <li className="nav-item">
//               <Link className="nav-link" href="/products">
//                 Products
//               </Link>
//             </li>
//             <li className="nav-item">
//               <Link className="nav-link" href="/contact-us">
//                 Contact Us
//               </Link>
//             </li>
//           </ul>

//           <div className="d-flex align-items-center gap-3">
//             {/* ✅ Dynamic Cart Count */}
//             <Link href="/cart" className="cart-btn position-relative">
//               <img
//                 src="/assets/images/icons/cart.png"
//                 alt="Cart Icon"
//               />{" "}
//               Cart
//               <span className="items-count">
//                 {cartCount > 0 ? cartCount : 0}
//               </span>
//             </Link>

//             <Link href="/wishlist" className="top-btn">
//               <img
//                 src="/assets/images/icons/wishlist.png"
//                 alt="Wishlist Icon"
//               />
//             </Link>

//             {/* ✅ User Section */}
//             {!user ? (
//               <Link href="/login" className="top-btn">
//                 <img
//                   src="/assets/images/icons/user.png"
//                   alt="User Icon"
//                 />
//               </Link>
//             ) : (
//               <div className="dropdown">
//                 <button
//                   className="btn btn-light dropdown-toggle"
//                   type="button"
//                   id="userMenu"
//                   data-bs-toggle="dropdown"
//                   aria-expanded="false"
//                 >
//                   {user.name}
//                 </button>
//                 <ul
//                   className="dropdown-menu dropdown-menu-end"
//                   aria-labelledby="userMenu"
//                 >
//                   <li>
//                     <Link className="dropdown-item" href="/profile">
//                       Profile
//                     </Link>
//                   </li>
//                   <li>
//                     <button className="dropdown-item" onClick={handleLogout}>
//                       Logout
//                     </button>
//                   </li>
//                 </ul>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </nav>
//   );
// }





"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

export default function Topbar() {
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const name = localStorage.getItem("name");
    const userType = localStorage.getItem("userType");
    if (name) setUser({ name, userType });

    fetchCartCount();
    fetchWishlistCount();
  }, []);

  // ✅ Fetch total items in cart (not total quantity)
  const fetchCartCount = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await axios.get("/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCartCount(res.data.length || 0);
    } catch (err) {
      console.error("Failed to load cart count:", err);
      setCartCount(0);
    }
  };

  // ✅ Fetch total wishlist items
  const fetchWishlistCount = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await axios.get("/api/wishlist", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlistCount(res.data.items?.length || 0);
    } catch (err) {
      console.error("Failed to load wishlist count:", err);
      setWishlistCount(0);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <nav className="main-nav navbar navbar-expand-lg bg-white">
      <div className="container-fluid">
        <Link className="navbar-brand d-flex align-items-center" href="/">
          <img src="/assets/images/logo.png" alt="Logo" className="me-2" />
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div
          className="collapse navbar-collapse justify-content-center"
          id="navbarNav"
        ></div>

        <div className="right-side">
          <ul className="navbar-nav gap-3">
            <li className="nav-item">
              <Link className="nav-link" href="/">
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/products">
                Products
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" href="/contact-us">
                Contact Us
              </Link>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-3">
            {/* ✅ Dynamic Cart Count */}
            <Link href="/cart" className="cart-btn position-relative">
              <img
                src="/assets/images/icons/cart.png"
                alt="Cart Icon"
              />{" "}
              Cart
              <span className="items-count">
                {cartCount > 0 ? cartCount : 0}
              </span>
            </Link>

            {/* ✅ Wishlist with dynamic count (added same as cart) */}
            <Link href="/wishlist" className="top-btn position-relative">
              <img
                src="/assets/images/icons/wishlist.png"
                alt="Wishlist Icon"
              />
              <span className="items-count">
                {wishlistCount > 0 ? wishlistCount : 0}
              </span>
            </Link>

            {/* ✅ User Section */}
            {!user ? (
              <Link href="/login" className="top-btn">
                <img
                  src="/assets/images/icons/user.png"
                  alt="User Icon"
                />
              </Link>
            ) : (
              <div className="dropdown">
                <button
                  className="btn btn-light dropdown-toggle"
                  type="button"
                  id="userMenu"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {user.name}
                </button>
                <ul
                  className="dropdown-menu dropdown-menu-end"
                  aria-labelledby="userMenu"
                >
                  <li>
                    <Link className="dropdown-item" href="/profile">
                      Profile
                    </Link>
                  </li>
                  <li>
                    <button className="dropdown-item" onClick={handleLogout}>
                      Logout
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Keep your existing style (only add badge style if not exist) */}
      <style jsx>{`
        .items-count {
          position: absolute;
          top: -8px;
          right: -10px;
          background-color: red;
          color: #fff;
          border-radius: 50%;
          font-size: 12px;
          padding: 2px 6px;
          line-height: 1;
          font-weight: 600;
        }
      `}</style>
    </nav>
  );
}
