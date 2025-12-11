import Footer from '@/components/footer/Footer';
import Offcanvas from '@/components/header/Offcanvas';
import Topbar from '@/components/header/Topbar';
import React from 'react';

// app/terms-and-conditions/page.js
export default function TermsConditions() {
  return (
    <div className="privacy-page">
      <Topbar />
      <Offcanvas />

      <div className="contact-hero">
        <img src="/assets/images/contact-hero.webp" alt="contact-hero" />
      </div>

      <div className="container">
        <div className="privacy-content">
          <h1>Terms & Conditions</h1>
          <p className="update-date">Last updated: 12/11/2025</p>

          <p>
            Welcome to One Prime Studios. By accessing or using www.oneprimestudios.com (“Website”),
            you agree to comply with and be bound by the following Terms & Conditions (“Terms”). If
            you do not agree with these Terms, please discontinue using the Website and services
            immediately.
          </p>

          <h2>1. About Our Services</h2>
          <p>
            One Prime Studios provides online printing, designing, and customization services. 
            All products are made as per the specifications submitted by customers such as artwork, 
            size, finishing, paper type, and quantity.
          </p>

          <h2>2. User Responsibilities</h2>
          <p>By placing an order, you confirm that:</p>
          <ul>
            <li>You have reviewed and approved all artwork/design files before submission</li>
            <li>Files submitted are owned by you or you have legal permission to use them</li>
            <li>You do not upload offensive, copyrighted, illegal, or objectionable materials</li>
            <li>Contact information & delivery address provided are accurate and complete</li>
          </ul>

          <h2>3. Product Accuracy & Variations</h2>
          <p>
            Due to differences in screen brightness, colors, and print technology, 
            slight variations may occur between digital previews and final printed products.
          </p>
          <p>
            Such variations are normal in commercial printing and are not considered defects.
          </p>

          <h2>4. Order Processing & Delivery</h2>
          <p>
            All orders are processed only after successful payment and file verification. 
            Estimated processing and delivery timelines are provided on product pages but may vary 
            due to factors like quantity, finishing, courier delays, holidays, or natural circumstances.
          </p>

          <h2>5. Pricing & Payments</h2>
          <p>
            All prices displayed on our website are final and inclusive/exclusive of taxes where applicable.
            We reserve the right to modify prices at any time without prior notice.
          </p>
          <p>
            Payments are processed securely via third-party payment gateways (Razorpay, Paytm, Cashfree, etc.). 
            We do not store card details, UPI pins, or banking passwords.
          </p>

          <h2>6. Artwork, Files & Intellectual Property</h2>
          <p>
            All artwork files uploaded by customers remain their property. 
            One Prime Studios does not claim rights over user-uploaded content and does not reuse 
            or share files with any third party except as required for order processing.
          </p>
          <p>
            All website content including designs, text, brand assets, and graphics belongs to 
            One Prime Studios and may not be copied or reproduced without permission.
          </p>

          <h2>7. Cancellation & Modification Policy</h2>
          <p>Orders cannot be cancelled or modified once printing has started.</p>
          <p>Cancellation is only possible if:</p>
          <ul>
            <li>Payment has been made but printing has not begun</li>
            <li>Duplicate order or duplicate payment occurred</li>
          </ul>

          <h2>8. Limitation of Liability</h2>
          <p>
            One Prime Studios is not liable for delays caused by courier partners, customer-uploaded
            file issues, low-resolution artwork, or errors in shipping information provided by the user.
          </p>
          <p>
            Under no circumstance shall One Prime Studios be responsible for indirect, incidental, or
            consequential damages.
          </p>

          <h2>9. Fraud Prevention & Verification</h2>
          <p>
            We may verify your identity, order details, or payment information to prevent fraudulent 
            transactions. Orders flagged as suspicious may be paused or cancelled.
          </p>

          <h2>10. Third-Party Links</h2>
          <p>
            Our website may contain links to third-party platforms. These external websites operate under 
            their own terms and privacy policies, and One Prime Studios is not responsible for their content.
          </p>

          <h2>11. Dispute Resolution</h2>
          <p>
            Any dispute arising from usage of this website shall be governed under the laws of India 
            and subject to jurisdiction of Lucknow, Uttar Pradesh.
          </p>

          <h2>12. Amendments to Terms</h2>
          <p>
            We reserve the right to update or modify these Terms at any time. Changes will be posted 
            on this page with a revised “Last Updated” date.
          </p>

          <h2>13. Contact Information</h2>
          <p>
            For any queries, complaints, or feedback related to these Terms & Conditions, contact us:
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
