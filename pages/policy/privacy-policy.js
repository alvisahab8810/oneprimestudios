import Footer from '@/components/footer/Footer';
import Offcanvas from '@/components/header/Offcanvas';
import Topbar from '@/components/header/Topbar';
import React from 'react';

// app/privacy-policy/page.js
export default function PrivacyPolicy() {
  return (
    <div className="privacy-page">
      <Topbar />
      <Offcanvas />

      <div className="contact-hero">
        <img src="/assets/images/contact-hero.webp" alt="contact-hero" />
      </div>

      <div className="container">
        <div className="privacy-content">
          <h1>Privacy Policy</h1>
          <p className="update-date">Last updated: 12/11/2025</p>

          <p>
            Welcome to One Prime Studios (“we”, “our”, “us”). We value your trust and are fully committed
            to protecting your personal information. This Privacy Policy explains how we collect, use,
            store, and safeguard the information you provide when interacting with our platform
            www.oneprimestudios.com and our printing, designing, and related services.
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            We collect information that helps us deliver a smooth, personalized, and secure shopping experience.
            This may include:
          </p>
          <ul>
            <li>Personal details such as your name, email address, and phone number</li>
            <li>Billing and shipping addresses for order delivery</li>
            <li>Uploaded files, designs, artwork, and print materials</li>
            <li>Transaction and payment information (handled securely by our payment partners)</li>
            <li>Technical data like IP address, browser type, device information, and usage analytics</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use your information responsibly for multiple important purposes:</p>
          <ul>
            <li>Processing orders, payments, and deliveries efficiently</li>
            <li>Communicating updates regarding orders, support, and service improvements</li>
            <li>Enhancing our website performance, speed, and user experience</li>
            <li>Detecting fraud, verifying transactions, and maintaining system security</li>
            <li>Providing personalized product suggestions and customer support</li>
          </ul>

          <h2>3. Sharing & Disclosure of Data</h2>
          <p>
            We respect your privacy and never sell or rent your personal data. Information is shared strictly on
            a need basis with:
          </p>
          <ul>
            <li>Couriers and delivery partners for order fulfillment</li>
            <li>Secure payment gateway providers for transaction processing</li>
            <li>Verified third-party vendors supporting our operations</li>
          </ul>

          <h2>4. Cookies, Tracking & Analytics</h2>
          <p>
            To provide an optimized browsing experience, we use cookies and tracking tools. These help us:
          </p>
          <ul>
            <li>Store user preferences for faster navigation</li>
            <li>Analyze website performance and user behavior</li>
            <li>Display relevant offers and products</li>
          </ul>

          <h2>5. Data Protection & Security Measures</h2>
          <p>
            Your data security is extremely important to us. We use industry-level encryption, firewall
            protection, and secure servers to safeguard your information. Though no digital system is
            100% hack-proof, we constantly upgrade our security measures to ensure maximum protection.
          </p>

          <h2>6. Your Rights & Choices</h2>
          <p>As our valued customer, you have complete control over your data. You may:</p>
          <ul>
            <li>Request correction of inaccurate or incomplete information</li>
            <li>Request deletion of your personal data (where legally applicable)</li>
            <li>Choose to opt-out of promotional and marketing communications</li>
            <li>Request a copy of the information we have collected about you</li>
          </ul>

          <h2>7. Third-Party Links & External Services</h2>
          <p>
            Our website may include links to external websites or third-party tools. We are not responsible
            for their privacy practices or content. We recommend reviewing their privacy policies separately.
          </p>

          <h2>8. Policy Updates & Amendments</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect new services, features, or legal
            requirements. Updated versions will be posted on this page with the revised date.
          </p>

          <h2>9. Contact Information</h2>
          <p>
            If you have any questions, concerns, or requests regarding our Privacy Policy, feel free to
            contact us anytime:
          </p>

          <p><strong>One Prime Studios</strong></p>
          <p>Call: +91 87370 38342</p>
          <p>Email: Contact@oneprimestudios.in</p>
          <p>
            Address: 591 eya/19, Raibareli Rd, Kumhar Mandi, Telibagh, Lucknow,
            Uttar Pradesh 226029
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
