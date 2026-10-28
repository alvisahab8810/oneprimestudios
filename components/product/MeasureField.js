"use client";
// A measured attribute: the buyer types how much they need and the rate the
// admin set for that figure prices it straight away. The rate bands themselves
// stay with the admin — the buyer only sees what their own figure costs.
import { clampMeasure, measureExtra, measureRateAt } from "@/lib/productPricing";

const money = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function MeasureField({ attr, value, onChange, inputClassName }) {
  const rules = attr?.measureRules || {};
  const unit = rules.unit || "unit";
  const min = Number(rules.min || 0);
  const max = Number(rules.max || 0);
  const step = Number(rules.step || 1) || 1;

  const typed = Number(value);
  const amount = value === "" || value === undefined || !Number.isFinite(typed) ? 0 : typed;

  // The figure actually charged, held inside the range the admin allows
  const charged = clampMeasure(attr, amount);
  const rate = measureRateAt(attr, charged);
  const extra = measureExtra(attr, amount);

  const outsideRange = amount > 0 && charged !== amount;

  return (
    <>
      <input
        type="number"
        min={min || 0}
        max={max > 0 ? max : undefined}
        step={step}
        placeholder={`Enter ${unit}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />

      {(min > 0 || max > 0) && (
        <div style={{ marginTop: 4, fontSize: 12, color: outsideRange ? "#E10600" : "#9ca3af" }}>
          {min > 0 ? min : 0}
          {max > 0 ? ` – ${max}` : " or more"} {unit}
        </div>
      )}

      {amount > 0 && (
        <div style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>
          {charged} {unit} × {money(rate)} ={" "}
          <strong style={{ color: "#E10600" }}>{money(extra)}</strong>
        </div>
      )}
    </>
  );
}
