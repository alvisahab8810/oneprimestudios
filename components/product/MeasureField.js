"use client";
// A measured attribute: the buyer types how much they need, and nothing else.
// The allowed range and the rate bands behind it stay with the admin, so the
// field shows no guide text and no working — the price updates on its own.
export default function MeasureField({ attr, value, onChange, inputClassName }) {
  const rules = attr?.measureRules || {};
  const unit = rules.unit || "unit";
  const min = Number(rules.min || 0);
  const max = Number(rules.max || 0);
  const step = Number(rules.step || 1) || 1;

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
    </>
  );
}
