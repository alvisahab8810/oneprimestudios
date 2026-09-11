"use client";

// Homepage stats band — heading + animated counters.
// Counters page load pe chalte hain agar section already visible ho,
// warna scroll karke section viewport me aate hi chalte hain.

import React, { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 500, suffix: "+", label: "Projects Delivered" },
  { value: 250, suffix: "+", label: "Clients Served" },
  { value: 1000000, suffix: "+", label: "Materials Supplied" },
  { value: 15, suffix: "", label: "Years Experience" },
];

const DURATION = 2000; // ms
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function Counter({ value, suffix, start }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!start) return undefined;

    // Reduced-motion users ko seedha final number
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setDisplay(value);
      return undefined;
    }

    const startTime = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startTime) / DURATION, 1);
      setDisplay(Math.round(easeOutCubic(progress) * value));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [start, value]);

  return (
    <h3 className="impact-stat-value">
      {display.toLocaleString("en-IN")}
      {suffix}
    </h3>
  );
}

export default function ImpactStats() {
  const [started, setStarted] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;

    // IntersectionObserver na ho to seedha chala do
    if (typeof IntersectionObserver === "undefined") {
      setStarted(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // isIntersecting page load pe bhi true hota hai agar section already screen pe hai
        if (entries[0].isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="impact-section" ref={sectionRef}>
      <div className="container">
        <h2 className="impact-heading">
          Where <span>Creativity</span> Meets
          <br />
          Manufacturing <span>Power</span>
        </h2>

        <p className="impact-desc">
          We&apos;re not just another printer. One Prime Studios is a complete brand
          powerhouse — combining cutting-edge creative strategy with industrial-grade
          printing capabilities. From concept to production, we deliver results that
          make an impact.
        </p>

        <div className="impact-stats">
          {STATS.map((stat) => (
            <div className="impact-stat" key={stat.label}>
              <Counter value={stat.value} suffix={stat.suffix} start={started} />
              <p className="impact-stat-label">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
