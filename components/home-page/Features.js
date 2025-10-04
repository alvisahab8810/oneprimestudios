import React from "react";

export default function Features() {
  return (
    <>
      <div className="features-container">
        <div className="feature-box">
          <img src="/assets/images/icons/features/google.png" alt="Google" className="feature-icon" />
          <div>
            <h4 className="feature-title">4.8</h4>
            <p className="feature-text">Google reviews</p>
          </div>
        </div>

        <div className="feature-box">
          <img
            src="/assets/images/icons/features/quality.png"
            alt="Premium Quality"
            className="feature-icon"
          />
          <div>
            <h4 className="feature-title">Premium Quality</h4>
            <p className="feature-text">best quality paper and ink</p>
          </div>
        </div>

        <div className="feature-box">
          <img
            src="/assets/images/icons/features/express.png"
            alt="Express Services"
            className="feature-icon"
          />
          <div>
            <h4 className="feature-title">Express Services</h4>
            <p className="feature-text">Always ontime</p>
          </div>
        </div>

        <div className="feature-box">
          <img
            src="/assets/images/icons/features/bestprice.png"
            alt="Best Price"
            className="feature-icon"
          />
          <div>
            <h4 className="feature-title">Best Price</h4>
            <p className="feature-text">best work, best price</p>
          </div>
        </div>
      </div>
    </>
  );
}
