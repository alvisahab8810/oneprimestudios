import Footer from '@/components/footer/Footer';
import Offcanvas from '@/components/header/Offcanvas';
import Topbar from '@/components/header/Topbar';
import React from 'react';

// app/refund-cancellation-policy/page.js
export default function RefundCancellationPolicy() {
  return (
    <div className="privacy-page">
      <Topbar />
      <Offcanvas />

      <div className="contact-hero">
        <img src="/assets/images/contact-hero.webp" alt="contact-hero" />
      </div>

      <div className="container">
        <div className="privacy-content">
          <h1>Refund & Cancellation Policy</h1>
          <p className="update-date">Last updated: 12/11/2025</p>

          <p>
            At One Prime Studios, we aim to provide the best printing, designing, and custom product
            services for both B2B and B2C customers. All orders are processed with utmost care and precision.
            Since most of our products are customizable and printed on demand, we follow a strict
            Refund and Cancellation Policy.
          </p>

          <h2>1. Cancellation Policy</h2>
          <p>
            As our services involve personalized and customized printing, orders cannot be cancelled once
            printing or production has started.
          </p>

          <p>Order cancellation is ONLY allowed when:</p>
          <ul>
            <li>The order is placed but printing has NOT started yet</li>
            <li>A duplicate order or duplicate payment was made</li>
            <li>In case of technical or processing failure on our end</li>
          </ul>

          <p>
            If eligible, cancellation must be requested within <strong>2 hours</strong> of placing the order
            by contacting our support team.
          </p>

          <h2>2. Refund Eligibility</h2>
          <p>You may request a refund under the following situations:</p>
          <ul>
            <li>Duplicate payment made accidentally</li>
            <li>Order cancelled before printing/processing began</li>
            <li>Defective, damaged, or incorrect product delivered</li>
            <li>Print output differs significantly from the approved artwork due to our error</li>
          </ul>

          <h3>2.1 Non-Refundable Situations</h3>
          <p>Refunds are NOT applicable in the following cases:</p>
          <ul>
            <li>Color differences due to screen vs. print variations</li>
            <li>Low-quality, blurry artwork uploaded by the customer</li>
            <li>Incorrect size, orientation, or design submitted by user</li>
            <li>Customer changes their mind after production has started</li>
            <li>Delays caused by courier partners or incorrect address</li>
          </ul>

          <h2>3. Replacement Policy (If Applicable)</h2>
          <p>We offer a replacement in the following cases:</p>
          <ul>
            <li>Printed product is damaged during delivery</li>
            <li>You receive a product different from your order specifications</li>
            <li>There is a major printing defect due to our processing</li>
          </ul>

          <p>
            Replacement requests must be submitted within <strong>24 hours</strong> of delivery along with
            images/videos as proof.
          </p>

          <h2>4. Refund Processing Time</h2>
          <p>
            Once approved, refunds will be processed within <strong>5–7 business days</strong> through the
            original payment method (Razorpay, Paytm, Cashfree, UPI, Netbanking, etc.).
          </p>

          <p>
            Refund timelines may vary depending on your bank or payment gateway.
          </p>

          <h2>5. No Returns Policy</h2>
          <p>
            Since products are custom-made, printed specifically for each customer, they cannot be returned
            unless the delivered item is defective or incorrect.
          </p>

          <h2>6. B2B Order Policy</h2>
          <p>
            For bulk printing orders (B2B), no cancellation or refund is allowed once production has started,
            due to materials being consumed and slots being booked.
          </p>

          <p>B2B orders require:</p>
          <ul>
            <li>100% advance payment</li>
            <li>Final artwork approval before production</li>
            <li>No refund once artwork is approved and production begins</li>
          </ul>

          <h2>7. Shipping Delays</h2>
          <p>
            One Prime Studios is not responsible for delays caused by courier partners, weather issues,
            festivals, strikes, or unforeseen circumstances.
          </p>

          <p>
            In such cases, refunds will not be issued, but we will assist you in tracking the shipment.
          </p>

          <h2>8. How to Request a Refund or Cancellation</h2>
          <p>
            To request a refund, cancellation, or replacement, please contact us through:
          </p>
          <ul>
            <li><strong>Phone:</strong> +91 87370 38342</li>
            <li><strong>Email:</strong> Contact@oneprimestudios.in</li>
            <li>
              <strong>Address:</strong> 591 eya/19, Raibareli Rd, Kumhar Mandi, Telibagh, 
              Lucknow, Uttar Pradesh 226029
            </li>
          </ul>

          <h2>9. Final Decision</h2>
          <p>
            One Prime Studios reserves the right to make the final decision regarding refunds, replacements,
            or cancellations based on evidence, production status, and company policies.
          </p>

          <h2>10. Policy Changes</h2>
          <p>
            We may update this Refund & Cancellation Policy as needed. Any changes will be posted with an
            updated “Last Updated” date.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
