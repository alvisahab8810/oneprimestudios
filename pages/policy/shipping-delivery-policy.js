import Footer from '@/components/footer/Footer';
import Offcanvas from '@/components/header/Offcanvas';
import Topbar from '@/components/header/Topbar';
import React from 'react';

// app/shipping-delivery-policy/page.js
export default function ShippingDeliveryPolicy() {
  return (
    <div className="privacy-page">
      <Topbar />
      <Offcanvas />

      <div className="contact-hero">
        <img src="/assets/images/contact-hero.webp" alt="contact-hero" />
      </div>

      <div className="container">
        <div className="privacy-content">
          <h1>Shipping & Delivery Policy</h1>
          <p className="update-date">Last updated: 12/11/2025</p>

          <p>
            At One Prime Studios, we strive to deliver all printing and custom product orders quickly,
            securely, and professionally. This Shipping & Delivery Policy explains how your orders are
            processed, packaged, shipped, and delivered across India for both B2B and B2C customers.
          </p>

          <h2>1. Order Processing Time</h2>
          <p>
            Processing time depends on the product type, printing method, finishing style, and order
            quantity. Typical processing times are:
          </p>
          <ul>
            <li><strong>Standard printing orders:</strong> 1–3 business days</li>
            <li><strong>Bulk/B2B orders:</strong> 3–7 business days</li>
            <li><strong>Special finishes (lamination, spot UV, embossing):</strong> 2–5 business days</li>
            <li><strong>Custom designs:</strong> Extra 1–2 days based on approval</li>
          </ul>

          <p>
            Orders only enter production after successful payment and final artwork approval.
          </p>

          <h2>2. Estimated Delivery Time</h2>
          <p>Delivery timelines depend on your location and courier partner. Approximate timelines:</p>

          <ul>
            <li><strong>Lucknow (Local Delivery):</strong> 1–2 days</li>
            <li><strong>Uttar Pradesh (Regional Delivery):</strong> 2–4 days</li>
            <li><strong>Metro Cities (Delhi, Mumbai, Bangalore, etc.):</strong> 3–5 days</li>
            <li><strong>Rest of India:</strong> 4–7 days</li>
          </ul>

          <p>Delivery may take longer during peak seasons, holidays, or festivals.</p>

          <h2>3. Shipping Charges</h2>
          <p>
            Shipping charges are automatically calculated at checkout based on:
          </p>
          <ul>
            <li>Delivery location</li>
            <li>Weight and size of the package</li>
            <li>Quantity of products ordered</li>
            <li>Courier partner rates</li>
          </ul>

          <p>Free shipping may be available during promotional periods.</p>

          <h2>4. Order Tracking</h2>
          <p>
            Once your order is shipped, you will receive a tracking ID through Email, WhatsApp, or SMS.
            You can track your order in real-time via the courier’s tracking portal.
          </p>

          <h2>5. Delivery Attempts</h2>
          <p>
            Courier partners generally attempt delivery 2–3 times. If the package cannot be delivered due to:
          </p>
          <ul>
            <li>Wrong address</li>
            <li>Customer unavailable</li>
            <li>Phone switched off</li>
            <li>Refusal to accept</li>
          </ul>
          <p>The order will be returned to us. Re-shipping charges will apply.</p>

          <h2>6. Damaged or Open Package Delivery</h2>
          <p>Please do the following if you receive a damaged or open parcel:</p>
          <ul>
            <li>Take clear photos/videos of the package</li>
            <li>Do NOT accept the package if severely damaged</li>
            <li>Report to us within <strong>24 hours</strong> of delivery</li>
          </ul>

          <p>
            If validated, we will arrange a replacement or resolve the issue based on evidence.
          </p>

          <h2>7. Delay in Delivery</h2>
          <p>
            One Prime Studios is not responsible for delays caused by courier companies, weather issues,
            natural disasters, strikes, or incorrect delivery information.
          </p>

          <p>
            We will assist you in tracking and resolving courier delays but refunds cannot be issued for
            shipping delays.
          </p>

          <h2>8. Failed Delivery Due to Customer Error</h2>
          <p>We are not liable for delivery failure if:</p>
          <ul>
            <li>Incorrect address was provided</li>
            <li>Phone number was unreachable</li>
            <li>Customer refused delivery</li>
            <li>No one was available to receive</li>
          </ul>

          <p>Re-delivery will require additional shipping charges.</p>

          <h2>9. B2B Bulk Order Shipping</h2>
          <p>
            B2B shipments may require multi-box packaging, pallet shipping, or heavy-load transport.
            Delivery timelines may differ from standard orders.
          </p>
          <ul>
            <li>Bulk orders cannot be returned or refunded once shipped</li>
            <li>Transit damages must be reported within 24 hours</li>
            <li>Transport costs vary based on volume and distance</li>
          </ul>

          <h2>10. International Shipping</h2>
          <p>
            Currently, One Prime Studios provides shipping only within India. International shipping may
            be introduced in the future.
          </p>

          <h2>11. Contact for Shipping Queries</h2>
          <p>If you have any concerns about delivery or shipping, contact us:</p>

          <p><strong>One Prime Studios</strong></p>
          <p><strong>Phone:</strong> +91 87370 38342</p>
          <p><strong>Email:</strong> Contact@oneprimestudios.in</p>
          <p>
            <strong>Address:</strong> 591 eya/19, Raibareli Rd, Kumhar Mandi, Telibagh,
            Lucknow, Uttar Pradesh 226029
          </p>

          <h2>12. Policy Updates</h2>
          <p>
            We may update this Shipping & Delivery Policy from time to time based on courier availability,
            service changes, or business requirements. Updated versions will be posted with the revised date.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
