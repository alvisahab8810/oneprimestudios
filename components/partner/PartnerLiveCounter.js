"use client";
import React from "react";

const PartnerStatsBanner = () => {
  const BASE_COUNT = 60;
  const START_DATE = new Date("2025-01-01"); // set any past date

  const today = new Date();
  const diffInDays = Math.floor(
    (today - START_DATE) / (1000 * 60 * 60 * 24)
  );

  // 1 or 2 growth per day (deterministic, not random every render)
  const dailyGrowth = diffInDays % 2 === 0 ? 1 : 2;

  const totalCount = BASE_COUNT + diffInDays * dailyGrowth;

  return (
    <div className="partner-stats-banner">
      <div className="stats-content d-flex">
        <span className="stats-label">
          Partners  Registered with Us (India)
        </span>
        <span className="stats-value">
          {totalCount.toLocaleString()}
        </span>
        <span className="stats-label">
          Growing steadily across India
        </span>
      </div>
    </div>
  );
};

export default PartnerStatsBanner;
