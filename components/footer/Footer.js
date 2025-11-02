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
  <p>One Prime Studios</p>
  <ul>
    <li>One Prime Productions</li>
    <li>One Prime Events</li>
    <li>One Prime Media</li>
  </ul>
  <p>Creating excellence in visual storytelling and digital experiences</p>
</div>

        </div>

        {/* Right Columns */}
        <div className="footer-right">
          <div className="footer-links">
            <h4>Home</h4>
            <ul>
              <li><a href="/products">Products</a></li>
              <li><a href="#">Services</a></li>
              <li><a href="/contact-us">Contact Us</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Help</h4>
            <ul>
              <li><a href="/contact-us">Customer Support</a></li>
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
       <p>
        Designed & Developed by 

        <a href="https://viralon.in" target="_blank" rel="noopener noreferrer" style={{marginLeft:"5px" , color:"#6c5dd4"}}>
          Viralon
        </a>
      </p>

      </div>
      </div>
    </footer>
  );
};

export default Footer;
