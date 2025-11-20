import React from "react";

export default function MobileFeatures() {
  return (
    <div className="mobile-features-area desktop-none">

      <div className="mobile-features-wrapper">

        {/* Card 1 */}
        <div className="mobile-feature-box">
          <div className="mobile-feature-header">
            <img
              src="/assets/images/icons/features/google.png"
              alt="Google Reviews"
              className="mobile-feature-icon"
            />
            <h4 className="mobile-feature-title">4.8</h4>
          </div>
          <p className="mobile-feature-text">Google reviews</p>
        </div>

        {/* Card 2 */}
        <div className="mobile-feature-box">
          <div className="mobile-feature-header">
            <img
              src="/assets/images/icons/features/quality.png"
              alt="Premium Quality"
              className="mobile-feature-icon"
            />
            <h4 className="mobile-feature-title">Premium Quality</h4>
          </div>
          <p className="mobile-feature-text">best quality paper and ink</p>
        </div>

        {/* Card 3 */}
        <div className="mobile-feature-box">
          <div className="mobile-feature-header">
            <img
              src="/assets/images/icons/features/express.png"
              alt="Express Service"
              className="mobile-feature-icon"
            />
            <h4 className="mobile-feature-title">Express Service</h4>
          </div>
          <p className="mobile-feature-text">Always ontime</p>
        </div>

      </div>

    </div>
  );
}
