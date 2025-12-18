import React from "react";
import Link from "next/link";

export default function Offcanvas({ user, wishlistCount, cartCount, handleLogout }) {
  return (
    <>
      <div
        className="offcanvas offcanvas-start myntra-offcanvas"
        tabIndex="-1"
        id="mobileMenu"
        aria-labelledby="mobileMenuLabel"
      >
        {/* Header */}
        <div className="offcanvas-header myntra-offcanvas-header">
          <Link href="/" className="myntra-offcanvas-logo">
            <img src="/assets/images/logo.png" alt="Logo" />
          </Link>

          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="offcanvas"
          ></button>
        </div>

        {/* BODY */}
        <div className="offcanvas-body myntra-offcanvas-body">

             {/* Banner */}
                        <div className="ops-card-banner">
                          <img src="/assets/images/banner-girl.png" alt="Offer" />
                          
                          <div className="ops-banner-text">
                            <h4>FLAT <br/>₹300 OFF</h4>
                            <p>ON YOUR 1ST PURCHASE<br/>
                             & MORE EXCITING OFFERS</p>

                            {/* <img src="/assets/images/icons/add-cross.svg"></img> */}
                           
                          </div>
                        </div>

        

          {/* MENU LIST */}
          <ul className="myntra-menu-list">

            <li>
              <Link href="/">Home</Link>
            </li>

            <li>
              <Link href="/products">Products</Link>
            </li>

            <li>
              <Link href="/contact-us">Contact Us</Link>
            </li>

            
             <li>
              <Link href="/orders">My Orders</Link>
            </li>

             {/* <li>
              <Link href="#">Privacy Policy</Link>
            </li>

             <li>
              <Link href="#">Terms & Conditions</Link>
            </li> */}

         



         

          </ul>
        </div>

        {/* FOOTER BOTTOM (Myntra-style) */}
          {/* Social */}
                        <div className="ops-social-section">
                          <span>Follow Us On</span>
                          <div className="ops-social-icons">
                            <Link href="https://www.instagram.com/oneprimestudios"><img src="/assets/images/icons/instagram.svg" /></Link>
                            {/* <Link href="#"> <img src="/assets/images/icons/twitter.svg" /></Link> */}
                            {/* <Link href="#"> <img src="/assets/images/icons/facebook.svg" /></Link>
                            <Link href="#"> <img src="/assets/images/icons/youtube.svg" /> </Link> */}
                            
                          </div>
                        </div>
       
      </div>
    </>
  );
}
