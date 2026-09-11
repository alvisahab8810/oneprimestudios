// Footer.jsx — Figma "Get in touch" layout
import React from "react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/about-us" },
  // { label: "Services", href: "/#services" },
  { label: "Products", href: "/products" },
  { label: "Contact Us", href: "/contact-us" },
];

const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/oneprimestudios" },
  { label: "LinkedIn", href: "https://www.linkedin.com" },
];

const POLICY_LINKS = [
  { label: "Terms and Conditions", href: "/policy/terms-and-conditions" },
  { label: "Privacy Policy", href: "/policy/privacy-policy" },
  { label: "Refund & Cancellation", href: "/policy/refund-cancellation-policy" },
  { label: "Shipping & Delivery", href: "/policy/shipping-delivery-policy" },
];

const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          {/* left: get in touch */}
          <div className="footer-intro">
            <h2 className="footer-heading">
              GET IN <span>TOUCH</span>
            </h2>
            <p className="footer-intro-text">
              Whether you need a complete brand overhaul, bulk printing
              services, or custom merchandise, our team is ready to bring your
              vision to life.
            </p>

            <ul className="footer-contacts">
              <li className="footer-contact">
                <span className="footer-contact-icon">
                  <img src="/assets/images/icons/email2.svg" alt="" />
                </span>
                <div>
                  <span className="footer-contact-label">EMAIL</span>
                  <a href="mailto:Sales1@oneprimestudios.com">
                    Sales1@oneprimestudios.com
                  </a>
                </div>
              </li>

              <li className="footer-contact">
                <span className="footer-contact-icon">
                  <img src="/assets/images/icons/call2.svg" alt="" />
                </span>
                <div>
                  <span className="footer-contact-label">PHONE</span>
                  <a href="tel:+915224957479">+91 522 495 7479</a>
                  <a href="tel:+918737038342">+91 87370 38342</a>
                </div>
              </li>

              <li className="footer-contact">
                <span className="footer-contact-icon">
                  <img src="/assets/images/icons/location2.svg" alt="" />
                </span>
                <div>
                  <span className="footer-contact-label">LOCATION</span>
                  <span className="footer-contact-value">
                    591 eya/19, Raibareli Rd, Kumhar Mandi, Telibagh, Lucknow,
                    Uttar Pradesh 226029
                  </span>
                </div>
              </li>
            </ul>
          </div>

          {/* right: link columns */}
          <nav className="footer-nav" aria-label="Footer">
            <ul className="footer-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>

            <ul className="footer-col">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <ul className="footer-col">
              {POLICY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <hr className="footer-rule" />

        <div className="footer-bottom">
          <ul className="footer-bottom-links">
            <li>
              <Link href="/policy/terms-and-conditions">Terms of Use</Link>
            </li>
            <li>
              <Link href="/policy/privacy-policy">Privacy Policy</Link>
            </li>
            <li>
              <Link href="/policy/refund-cancellation-policy">
                About Cookies
              </Link>
            </li>
          </ul>

          <p className="footer-copy">
            Copyright © {new Date().getFullYear()} One Prime Studios. All rights
            reserved.
          </p>

          <p className="footer-note">
            One Prime Studios offers offset and digital printing, corporate
            gifting and custom merchandise for businesses — from visiting cards
            and stationery to large-format and bulk production runs.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
