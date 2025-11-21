// "use client";
// import React, { useEffect, useState } from "react";
// import Link from "next/link";
// import axios from "axios";

// export default function Topbar() {
//   const [user, setUser] = useState(null);
//   const [cartCount, setCartCount] = useState(0);
//   const [wishlistCount, setWishlistCount] = useState(0);

//   useEffect(() => {
//     const name = localStorage.getItem("name");
//     const userType = localStorage.getItem("userType");
//     if (name) setUser({ name, userType });

//     fetchCartCount();
//     fetchWishlistCount();
//   }, []);

//   // ✅ Fetch total items in cart (not total quantity)
//   const fetchCartCount = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) return;

//     try {
//       const res = await axios.get("/api/cart", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setCartCount(res.data.length || 0);
//     } catch (err) {
//       console.error("Failed to load cart count:", err);
//       setCartCount(0);
//     }
//   };

//   // ✅ Fetch total wishlist items
//   const fetchWishlistCount = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) return;

//     try {
//       const res = await axios.get("/api/wishlist", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setWishlistCount(res.data.items?.length || 0);
//     } catch (err) {
//       console.error("Failed to load wishlist count:", err);
//       setWishlistCount(0);
//     }
//   };

//   const handleLogout = () => {
//     localStorage.clear();
//     setUser(null);
//     window.location.href = "/login";
//   };

//   return (
//     <nav className="main-nav navbar navbar-expand-lg bg-white">
//       <div className="container">
//         <div className="mobile-header-row">
//           <div className="mobile-logo-area">
//             <div className="desktop-none">
//               <button
//                 className="hamburger desktop-none"
//                 data-bs-toggle="offcanvas"
//                 data-bs-target="#mobileMenu"
//                 href="#offcanvasExample"
//                 role="button"
//                 aria-controls="offcanvasExample"
//               >
//                 <img src="/assets/images/hamburger.svg" alt="Hamburger Icon" />
//               </button>
//             </div>

//             <Link
//               className="navbar-brand d-flex align-items-center logo-area"
//               href="/"
//             >
//               <img src="/assets/images/logo.png" alt="Logo" className="me-2" />
//             </Link>
//           </div>

//           <div className="right-side mobile-none">
//             <ul className="navbar-nav gap-3">
//               <li className="nav-item">
//                 <Link className="nav-link" href="/">
//                   Home
//                 </Link>
//               </li>
//               <li className="nav-item">
//                 <Link className="nav-link" href="/products">
//                   Products
//                 </Link>
//               </li>
//               <li className="nav-item">
//                 <Link className="nav-link" href="/contact-us">
//                   Contact Us
//                 </Link>
//               </li>
//             </ul>

//             <div className="d-flex align-items-center gap-3">
//               {/* ✅ Dynamic Cart Count */}
//               <Link href="/cart" className="cart-btn position-relative">
//                 <img src="/assets/images/icons/cart.png" alt="Cart Icon" />{" "}
//                 <span className="cart-text">Cart</span>
//                 <span className="items-count">
//                   {cartCount > 0 ? cartCount : 0}
//                 </span>
//               </Link>

//               {/* ✅ Wishlist with dynamic count (added same as cart) */}
//               <Link href="/wishlist" className="top-btn position-relative">
//                 <img
//                   src="/assets/images/icons/wishlist.png"
//                   alt="Wishlist Icon"
//                 />
//                 <span className="items-count">
//                   {wishlistCount > 0 ? wishlistCount : 0}
//                 </span>
//               </Link>

//               {/* ✅ User Section */}
//               {!user ? (
//                 <Link href="/login" className="top-btn">
//                   <img src="/assets/images/icons/user.png" alt="User Icon" />
//                 </Link>
//               ) : (
//                 <div className="dropdown">
//                   <button
//                     className="btn btn-light dropdown-toggle"
//                     type="button"
//                     id="userMenu"
//                     data-bs-toggle="dropdown"
//                     aria-expanded="false"
//                   >
//                     {user.name}
//                   </button>
//                   <ul
//                     className="dropdown-menu dropdown-menu-end"
//                     aria-labelledby="userMenu"
//                   >
//                     <li>
//                       <Link className="dropdown-item" href="/profile">
//                         Profile
//                       </Link>
//                     </li>
//                     <li>
//                       <button className="dropdown-item" onClick={handleLogout}>
//                         Logout
//                       </button>
//                     </li>
//                   </ul>
//                 </div>
//               )}
//             </div>
//           </div>

//           <div className="right-side desktop-none">
//             <div className="d-flex align-items-center gap-3  mobile-top-icons">
//               {/* ✅ Dynamic Cart Count */}
//               <Link href="/cart" className="cart-btn position-relative">
//                 <img src="/assets/images/icons/cart.svg" alt="Cart Icon" />
//                 <span className="items-count">
//                   {cartCount > 0 ? cartCount : 0}
//                 </span>
//               </Link>

//               {/* ✅ Wishlist with dynamic count (added same as cart) */}
//               <Link href="/wishlist" className="top-btn position-relative">
//                 <img
//                   src="/assets/images/icons/wishlist.svg"
//                   alt="Wishlist Icon"
//                 />
//                 <span className="items-count">
//                   {wishlistCount > 0 ? wishlistCount : 0}
//                 </span>
//               </Link>

//               {/* ✅ User Section */}
//               {!user ? (
//                 <Link href="/login" className="top-btn">
//                   <img src="/assets/images/icons/profile.svg" alt="User Icon" />
//                 </Link>
//               ) : (
//                 <div className="dropdown">
//                   <button
//                     className="btn btn-light dropdown-toggle"
//                     type="button"
//                     id="userMenu"
//                     data-bs-toggle="dropdown"
//                     aria-expanded="false"
//                   >
//                     {user.name}
//                   </button>
//                   <ul
//                     className="dropdown-menu dropdown-menu-end"
//                     aria-labelledby="userMenu"
//                   >
//                     <li>
//                       <Link className="dropdown-item" href="/profile">
//                         Profile
//                       </Link>
//                     </li>
//                     <li>
//                       <button className="dropdown-item" onClick={handleLogout}>
//                         Logout
//                       </button>
//                     </li>
//                   </ul>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ✅ Keep your existing style (only add badge style if not exist) */}
//       <style jsx>{`
//         .items-count {
//           position: absolute;
//           top: -8px;
//           right: -10px;
//           background-color: red;
//           color: #fff;
//           border-radius: 50%;
//           font-size: 12px;
//           padding: 2px 6px;
//           line-height: 1;
//           font-weight: 600;
//         }
//       `}</style>
//     </nav>
//   );
// }













"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import axios from "axios";

export default function Topbar() {
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [openProfileCard, setOpenProfileCard] = useState(false);


  // const dropdownRef = useRef(null);x
  const desktopDropdownRef = useRef(null);
const mobileDropdownRef = useRef(null);

  useEffect(() => {
    const name = localStorage.getItem("name");
    const email = localStorage.getItem("email");
    const userType = localStorage.getItem("userType");

    if (name) setUser({ name, email, userType });

    fetchCartCount();
    fetchWishlistCount();

    // OUTSIDE CLICK HANDLER — FIXED TO IGNORE INTERNAL CLICKS
  const handleClickOutside = (e) => {
  if (
    (desktopDropdownRef.current && desktopDropdownRef.current.contains(e.target)) ||
    (mobileDropdownRef.current && mobileDropdownRef.current.contains(e.target))
  ) {
    return; // Clicked inside → do nothing
  }

  setOpenProfileCard(false);
};


    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // FETCH CART COUNT
  const fetchCartCount = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await axios.get("/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCartCount(res.data.length || 0);
    } catch {
      setCartCount(0);
    }
  };

  // FETCH WISHLIST COUNT
  const fetchWishlistCount = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await axios.get("/api/wishlist", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWishlistCount(res.data.items?.length || 0);
    } catch {
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
      <div className="container">
        <div className="mobile-header-row">
          <div className="mobile-logo-area">

            {/* HAMBURGER */}
            {/* <div className="desktop-none">
              <button
                className="hamburger desktop-none"
                data-bs-toggle="offcanvas"
                data-bs-target="#mobileMenu"
              >
                <img src="/assets/images/hamburger.svg" alt="Hamburger Icon" />
              </button>
            </div> */}

             <div className="desktop-none">
               <button
                 className="hamburger desktop-none"
                 data-bs-toggle="offcanvas"
                 data-bs-target="#mobileMenu"
                 href="#offcanvasExample"
                role="button"
                aria-controls="offcanvasExample"
               >
                <img src="/assets/images/hamburger.svg" alt="Hamburger Icon" />
              </button>           
              </div>

            {/* LOGO */}
            <Link href="/" className="navbar-brand logo-area">
              <img src="/assets/images/logo.png" alt="Logo" />
            </Link>
          </div>

          {/* DESKTOP NAVIGATION */}
          <div className="right-side mobile-none">
            <ul className="navbar-nav gap-3">
              <li className="nav-item"><Link className="nav-link" href="/">Home</Link></li>
              <li className="nav-item"><Link className="nav-link" href="/products">Products</Link></li>
              <li className="nav-item"><Link className="nav-link" href="/contact-us">Contact Us</Link></li>
            </ul>

            <div className="d-flex align-items-center gap-3">
              {/* CART */}
              <Link href="/cart" className="cart-btn position-relative">
                <img src="/assets/images/icons/cart.png" alt="Cart" />
                <span className="cart-text">Cart</span>
                <span className="items-count">{cartCount}</span>
              </Link>

              {/* WISHLIST */}
              <Link href="/wishlist" className="top-btn position-relative">
                <img src="/assets/images/icons/wishlist.png" alt="Wishlist" />
                <span className="items-count">{wishlistCount}</span>
              </Link>

              {/* PROFILE DROPDOWN */}
             <div ref={desktopDropdownRef} className="ops-dropdown-wrapper ">

                {!user ? (
                  <Link href="/login" className="top-btn  ">
                    <img src="/assets/images/icons/user.png" alt="User" />
                  </Link>
                ) : (
                  <>
                    <button
                      className="ops-profile-btn top-btn  "
                      onClick={() => setOpenProfileCard(!openProfileCard)}
                    >
                      <img src="/assets/images/icons/user.png" alt="Profile" />
                    </button>

                    {openProfileCard && (
                      <div className="ops-profile-card ops-animate">
                        {/* Banner */}
                        <div className="ops-card-banner">
                          <img src="/assets/images/banner-girl.png" alt="Offer" />
                          
                          <div className="ops-banner-text">
                            <h4>FLAT <br/>₹300 OFF</h4>
                            <p>ON YOUR 1ST PURCHASE<br/>
                             & MORE EXCITING OFFERS</p>

                            {/* <img src="/assets/images/icons/add-cross.svg"></img> */}
                            <img
                              src="/assets/images/icons/add-cross.svg"
                              alt="close"
                              className="ops-close-icon"
                              onClick={() => setOpenProfileCard(false)}
                            />
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="ops-user-info">
                          <div className="ops-user-row">
                            <i className="ri-user-line"></i>
                            <h5>Hello {user.name}</h5>
                          </div>
                          <p className="ops-email">{user.email}</p>
                        </div>

                        {/* Menu */}
                        <ul className="ops-menu-list">
                          <li><Link href="/orders"><img src="/assets/images/icons/delivery-truck.png"></img> Orders & Tracking</Link></li>
                          <li><Link href="/wallet"><img src="/assets/images/icons/wallet.png"></img>Wallet</Link></li>
                          <li className="logout" onClick={handleLogout}><img src="/assets/images/icons/logout.png"></img> Logout</li>
                        </ul>

                        {/* Social */}
                        <div className="ops-social-section">
                          <span>Follow Us On</span>
                          <div className="ops-social-icons">
                            <Link href="#"><img src="/assets/images/icons/instagram.svg" /></Link>
                            <Link href="#"> <img src="/assets/images/icons/twitter.svg" /></Link>
                            <Link href="#"> <img src="/assets/images/icons/facebook.svg" /></Link>
                            <Link href="#"> <img src="/assets/images/icons/youtube.svg" /> </Link>
                            
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* MOBILE NAV ICONS */}
          <div className="right-side desktop-none">
            <div className="d-flex align-items-center gap-3 mobile-top-icons">
              <Link href="/cart" className="cart-btn position-relative">
                <img src="/assets/images/icons/cart.svg" alt="Cart" />
                <span className="items-count">{cartCount}</span>
              </Link>

              <Link href="/wishlist" className="top-btn position-relative">
                <img src="/assets/images/icons/wishlist.svg" alt="Wishlist" />
                <span className="items-count">{wishlistCount}</span>
              </Link>

               {/* PROFILE DROPDOWN */}
             <div ref={mobileDropdownRef} className="ops-dropdown-wrapper ">

                {!user ? (
                  <Link href="/login" className="top-btn  ">
                    <img src="/assets/images/icons/profile.svg" alt="User" />
                  </Link>
                ) : (
                  <>
                    <button
                      className="ops-profile-btn top-btn  "
                      onClick={() => setOpenProfileCard(!openProfileCard)}
                    >
                      <img src="/assets/images/icons/profile.svg" alt="Profile" />
                    </button>
{openProfileCard && (
  <div
    className="ops-profile-card ops-animate"
    onClick={(e) => e.stopPropagation()}
  >
                        {/* Banner */}
                        <div className="ops-card-banner">
                          <img src="/assets/images/banner-girl.png" alt="Offer" />
                          
                          <div className="ops-banner-text">
                            <h4>FLAT <br/>₹300 OFF</h4>
                            <p>ON YOUR 1ST PURCHASE<br/>
                             & MORE EXCITING OFFERS</p>

                            {/* <img src="/assets/images/icons/add-cross.svg"></img> */}
                            <img
                              src="/assets/images/icons/add-cross.svg"
                              alt="close"
                              className="ops-close-icon"
                              onClick={() => setOpenProfileCard(false)}
                            />
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="ops-user-info">
                          <div className="ops-user-row">
                            <i className="ri-user-line"></i>
                            <h5>Hello {user.name}</h5>
                          </div>
                          <p className="ops-email">{user.email}</p>
                        </div>

                        {/* Menu */}
                        <ul className="ops-menu-list">
                          <li><Link href="/orders"><img src="/assets/images/icons/delivery-truck.png"></img> Orders & Tracking</Link></li>
                          <li><Link href="/wallet"><img src="/assets/images/icons/wallet.png"></img>Wallet</Link></li>
                          <li className="logout" onClick={handleLogout}><img src="/assets/images/icons/logout.png"></img> Logout</li>
                        </ul>

                       
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .items-count {
          position: absolute;
          top: -8px;
          right: -10px;
          background: red;
          color: #fff;
          border-radius: 50%;
          font-size: 11px;
          padding: 2px 6px;
          font-weight: 600;
        }
      `}</style>
    </nav>
  );
}
