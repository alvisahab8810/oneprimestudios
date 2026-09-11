"use client";

// "Industrial Printing Power" — left content + right staggered image grid.
// Icons: /assets/images/icons/industrial/1..3.svg
// Images: /assets/images/industrial/1..4.webp
// File na mile to us jagah sirf khaali box rahega, layout nahi tootega.

import React from "react";
import Link from "next/link";

const POINTS = [
  {
    icon: "/assets/images/icons/bulk-order.svg",
    title: "Bulk Orders",
    text: "Industrial capacity for orders of any size",
  },
  {
    icon: "/assets/images/icons/fast.svg",
    title: "Fast Turnaround",
    text: "Expedited production without compromising quality",
  },
  {
    icon: "/assets/images/icons/precision.svg",
    title: "Precision Output",
    text: "Consistent, high-quality results every time",
  },
];

const IMAGES = [
  "/assets/images/services/card1.webp",
  "/assets/images/services/card2.webp",
  "/assets/images/services/card3.webp",
  "/assets/images/services/card4.webp",
];

const hideOnError = (e) => {
  e.currentTarget.style.visibility = "hidden";
};

export default function IndustrialPower() {
  return (
    <section className="ipower-section">
      <div className="container">
        <div className="ipower-row">
          {/* LEFT */}
          <div className="ipower-left">
            <h2 className="ipower-heading">
              Industrial
              <br />
              <span>Printing Power</span>
            </h2>

            <p className="ipower-desc">
              State-of-the-art machinery meets decades of expertise. Our industrial
              printing facility handles everything from small batches to massive
              production runs with uncompromising precision and speed.
            </p>

            <ul className="ipower-points">
              {POINTS.map((point) => (
                <li className="ipower-point" key={point.title}>
                  <span className="ipower-icon">
                    <img src={point.icon} alt="" onError={hideOnError} />
                  </span>
                  <div>
                    <h3 className="ipower-point-title">{point.title}</h3>
                    <p className="ipower-point-text">{point.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link href="/contact-us" className="ipower-cta">
              Request Bulk Quote
            </Link>
          </div>

          {/* RIGHT */}
          <div className="ipower-gallery">
            {IMAGES.map((src, i) => (
              <div className="ipower-shot" key={src}>
                <img src={src} alt="" loading="lazy" onError={hideOnError} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
