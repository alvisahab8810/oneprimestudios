// components/flash-sale/DealCountdown.js
// Live countdown to a deal's end. It counts against the server's clock
// (offsetMs = server time minus this device's time), so a phone with the
// wrong time still shows the right countdown. Calls onEnd once at zero.
import { useEffect, useRef, useState } from "react";
import { secondsLeft, splitDuration } from "@/lib/flashPricing";

const pad = (n) => String(n).padStart(2, "0");

export default function DealCountdown({ endsAt, offsetMs = 0, onEnd, size = "md", label = "Ends in" }) {
  const [left, setLeft] = useState(() => secondsLeft(endsAt, Date.now() + offsetMs));
  const ended = useRef(false);

  useEffect(() => {
    ended.current = false;
    const tick = () => {
      const s = secondsLeft(endsAt, Date.now() + offsetMs);
      setLeft(s);
      if (s <= 0 && !ended.current) {
        ended.current = true;
        if (onEnd) onEnd();
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt, offsetMs]);

  const { days, hours, minutes, seconds } = splitDuration(left);
  const parts = [
    ...(days > 0 ? [{ v: days, u: days === 1 ? "day" : "days" }] : []),
    { v: pad(hours), u: "hrs" },
    { v: pad(minutes), u: "min" },
    { v: pad(seconds), u: "sec" },
  ];
  const big = size === "lg";

  return (
    <div className="deal-countdown" role="timer" aria-live="off" aria-label={`${label} ${days ? `${days} days ` : ""}${hours} hours ${minutes} minutes`}>
      {label && <span className="dc-label">{label}</span>}
      <div className="dc-boxes">
        {parts.map((p, i) => (
          <div key={i} className="dc-box">
            <span className="dc-num">{p.v}</span>
            <span className="dc-unit">{p.u}</span>
          </div>
        ))}
      </div>
      <style jsx>{`
        .deal-countdown { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .dc-label { font-size: ${big ? 14 : 12}px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: inherit; opacity: 0.85; }
        .dc-boxes { display: inline-flex; gap: 6px; }
        .dc-box { background: #111; color: #fff; border-radius: 8px; min-width: ${big ? 58 : 44}px; padding: ${big ? "8px 6px" : "5px 4px"}; display: flex; flex-direction: column; align-items: center; line-height: 1; }
        .dc-num { font-size: ${big ? 26 : 18}px; font-weight: 800; font-variant-numeric: tabular-nums; }
        .dc-unit { font-size: ${big ? 11 : 10}px; margin-top: 4px; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.04em; }
      `}</style>
    </div>
  );
}
