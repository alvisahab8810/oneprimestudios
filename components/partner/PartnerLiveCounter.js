"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";

// The stats strip above the product listing. The figures are managed from
// Dashboard → Site Stats; nothing is shown until an admin adds one.
const PartnerStatsBanner = () => {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    let active = true;
    axios
      .get("/api/site-stats")
      .then((res) => {
        if (active) setStats(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        // The strip is decorative — a failed load just leaves it out
        if (active) setStats([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (stats.length === 0) return null;

  return (
    <div className="partner-stats-banner">
      {stats.map((stat) => (
        <div className="stats-content d-flex" key={stat._id}>
          {stat.label && <span className="stats-label">{stat.label}</span>}
          <span className="stats-value">
            {stat.prefix}
            {Number(stat.value || 0).toLocaleString("en-IN")}
            {stat.suffix}
          </span>
          {stat.note && <span className="stats-label">{stat.note}</span>}
        </div>
      ))}
    </div>
  );
};

export default PartnerStatsBanner;
