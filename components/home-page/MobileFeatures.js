import React from "react";

// Figma feature grid — 2x2, icon upar center me, title red bold, neeche sub text.
const FEATURES = [
  {
    icon: "/assets/images/icons/features/icon1.svg",
    title: "4.8 Star",
    text: "Google reviews",
  },
  {
    icon: "/assets/images/icons/features/icon2.svg",
    title: "Premium Quality",
    text: "best quality paper and ink",
  },
  {
    icon: "/assets/images/icons/features/icon3.svg",
    title: "Express Services",
    text: "Always ontime",
  },
  {
    icon: "/assets/images/icons/features/icon4.svg",
    title: "Best Price",
    text: "best work, best price",
  },
];

export default function MobileFeatures() {
  return (
    <div className="mobile-features-area desktop-none">
      <div className="mobile-features-wrapper">
        {FEATURES.map((feature) => (
          <div className="mobile-feature-box" key={feature.title}>
            <img
              src={feature.icon}
              alt={feature.title}
              className="mobile-feature-icon"
            />
            <h4 className="mobile-feature-title">{feature.title}</h4>
            <p className="mobile-feature-text">{feature.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
