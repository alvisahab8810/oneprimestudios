// Footer.jsx
import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className='container'>
        <div className="footer-top">
        {/* Left Column */}
        <div className="footer-left">
          <img src="/assets/images/white-logo.png" alt="One Prime Studios Logo" className="footer-logo" />
          <div className="footer-text">
            <p>Printers Club Group of Companies</p>
            <ul>
              <li>Printers Club of India Limited</li>
              <li>Printers Club Expo Private Limited</li>
              <li>Printers Club Today</li>
            </ul>
            <p>Dedicated for development of printing industry</p>
          </div>
        </div>

        {/* Right Columns */}
        <div className="footer-right">
          <div className="footer-links">
            <h4>Home</h4>
            <ul>
              <li><a href="#">Corporate</a></li>
              <li><a href="#">Services</a></li>
              <li><a href="#">Join Us</a></li>
              <li><a href="#">Contact Us</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Help</h4>
            <ul>
              <li><a href="#">Customer Support</a></li>
              <li><a href="#">Delivery Details</a></li>
              <li><a href="#">Terms & Conditions</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Divider */}
      <hr className="footer-divider" />

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>© 2025 One Prime Studios. All rights reserved.</p>
        <p>Designed by Viralon</p>
      </div>
      </div>
    </footer>
  );
};

export default Footer;
