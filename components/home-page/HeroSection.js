import React from "react";

export default function HeroSection() {
  return (
    <>
      <section className="hero">
        <div className="hero-left">
          <div className="hero-text">
            <p className="welcome">Welcome to</p>
            <h2>One Prime Studios</h2>
            <h3>
              Bring Your Ideas to Life with High-Quality Prints <br />
              and on time Delivery
            </h3>
            <p className="description">
              Elementum consectetur at aliquet turpis ultricies felis egestas
              aliquam porta. Amet vitae.
            </p>

            <div className="hero-buttons">
              <button className="btn primary">Get Started</button>
              <button className="btn secondary">Read More</button>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="first-block">
            <img
              src="/assets/images/hero/hero1.png"
              alt="Model wearing t-shirt"
              className="hero-img"
            />
            <div className="right-badge">
              <h2>PRINT Products </h2>
            </div>
          </div>

          <div className="last-block">
            <img
              src="/assets/images/hero/hero2.png"
              alt="Model wearing t-shirt"
              className="hero-img"
            />
            <div className="right-badge">
              <h2>Business Card </h2>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
