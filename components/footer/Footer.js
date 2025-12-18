// // Footer.jsx
// import React from "react";

// const Footer = () => {
//   return (
//     <footer className="footer">
//       <div className="container">
//         <div className="footer-top">
//           {/* Left Column */}
//           <div className="footer-left">
//             <img
//               src="/assets/images/white-logo.png"
//               alt="One Prime Studios Logo"
//               className="footer-logo"
//             />
//             {/* <div className="footer-text">
//               <p>One Prime Studios</p>
//               <ul>
//                 <li>One Prime Productions</li>
//                 <li>One Prime Events</li>
//                 <li>One Prime Media</li>
//               </ul>
//               <p>
//                 Creating excellence in visual storytelling and digital
//                 experiences
//               </p>
//             </div> */}
//           </div>

//           {/* Right Columns */}
//           <div className="footer-right">
//             <div className="footer-links">
//               <h4>Home</h4>
//               <ul>
//                 <li>
//                   <a href="/products">Products</a>
//                 </li>
//                 <li>
//                   <a href="#">Services</a>
//                 </li>
//                 <li>
//                   <a href="/contact-us">Contact Us</a>
//                 </li>
//               </ul>
//             </div>
//             <div className="footer-links">
//               <h4>Help</h4>
//               <ul>
//                 <li>
//                   <a href="/contact-us">Customer Support</a>
//                 </li>
//                 <li>
//                   <a href="#">Delivery Details</a>
//                 </li>
//                 <li>
//                   <a href="#">Terms & Conditions</a>
//                 </li>
//                 <li>
//                   <a href="#">Privacy Policy</a>
//                 </li>
//               </ul>
//             </div>
//           </div>
//         </div>

//         {/* Divider */}
//         <hr className="footer-divider" />

//         {/* Bottom Bar */}
//         <div className="footer-bottom">
//           <p>© 2025 One Prime Studios. All rights reserved.</p>
//           <p>
//             Designed & Developed by
//             <a
//               href="https://viralon.in"
//               target="_blank"
//               rel="noopener noreferrer"
//               style={{ marginLeft: "5px", color: "#6c5dd4" }}
//             >
//               Viralon
//             </a>
//           </p>
//         </div>
//       </div>
//     </footer>
//   );
// };

// export default Footer;

// Footer.jsx
import React from "react";
import { FiPhoneCall } from "react-icons/fi";
import { HiOutlineMail } from "react-icons/hi";
import { PiMapPinLight } from "react-icons/pi";

const Footer = () => {
  return (
    <footer className="raj-footer">
      <h1 className="one-prime-studios-area">ONEPRIMESTUDIOS</h1>

      <div className="container footer-container">
        {/* Logo */}
        <div className="footer-logo-section">
          <img
            src="/assets/images/white-logo.png"
            alt="One Prime Studios"
            className="footer-logo"
          />
        </div>

        {/* Contact Items */}
        <div className="footer-info">
          {/* Call */}
          <div className="footer-item">
            <img src="/assets/images/icons/call2.svg" className="footer-icon" />
            <div>
              <h4>Call us</h4>
              <p>+91 87370 38342</p>
            </div>
          </div>

          {/* Email */}
          <div className="footer-item">
            <img
              src="/assets/images/icons/email2.svg"
              className="footer-icon"
            />
            <div>
              <h4>Need live help</h4>
              <p>Contact@oneprimestudios.in</p>
            </div>
          </div>

          {/* Address */}
          <div className="footer-item">
            <img
              src="/assets/images/icons/location2.svg"
              className="footer-icon"
            />

            <div>
              <h4>Address</h4>
              <p>
                591 eya/19, Raibareli Rd, Kumhar Mandi, Telibagh, Lucknow, Uttar
                Pradesh 226029
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Quick Links Section */}
      <div className="footer-links">
        <ul>
          <li>
            <a href="/policy/privacy-policy">Privacy Policy</a>
          </li>
          <li>
            <a href="/policy/terms-and-conditions">Terms & Conditions</a>
          </li>
          <li>
            <a href="/policy/refund-cancellation-policy">
              Refund & Cancellation Policy
            </a>
          </li>
          <li>
            <a href="/policy/shipping-delivery-policy">
              Shipping & Delivery Policy
            </a>
          </li>
        </ul>
      </div>

      {/* Divider */}
      <hr className="footer-divider" />

      {/* Bottom Bar */}
      <div className="container">
        <div className="footer-bottom1">
          <div className="ops-social-section">
            <span>Follow Us On</span>
            <div className="ops-social-icons">
              <a href="https://www.instagram.com/oneprimestudios">
                <img src="/assets/images/icons/instagram.svg" />
              </a>
              <a href="/#">
                {" "}
                <img src="/assets/images/icons/facebook.svg" />
              </a>
              <a href="/#">
                {" "}
                <img src="/assets/images/icons/youtube.svg" />{" "}
              </a>
            </div>
          </div>
          <div className="copyright-area d-flex align-items-center">
            <p>Copyright © 2025 One Prime Studios.</p>
            <p>
              Designed & Developed by
              <a
                href="https://viralon.in"
                target="_blank"
                rel="noopener noreferrer"
              >
                Viralon
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
