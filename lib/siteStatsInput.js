// lib/siteStatsInput.js — normalises what the Site Stats admin form sends, so
// the create and update routes validate the same way.

const text = (v, max = 160) => String(v ?? "").trim().slice(0, max);

const toNumber = (v, fallback = 0) => {
  if (v === null || v === undefined || String(v).trim() === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// Returns { data } for a usable payload, or { error } with the reason.
export function parseStatBody(body = {}) {
  const label = text(body.label);
  if (!label) return { error: "Label is required" };

  const value = toNumber(body.value, NaN);
  if (!Number.isFinite(value) || value < 0) {
    return { error: "Value must be a number of 0 or more" };
  }

  const grow = body.autoGrow || {};
  const enabled = grow.enabled === true || grow.enabled === "true";
  // A start date is what the growth is counted from, so auto-grow without one
  // would add nothing and look broken to the admin.
  const startDate = grow.startDate ? new Date(grow.startDate) : null;
  if (enabled && (!startDate || Number.isNaN(startDate.getTime()))) {
    return { error: "Pick a start date for automatic growth" };
  }

  return {
    data: {
      label,
      note: text(body.note),
      prefix: text(body.prefix, 8),
      suffix: text(body.suffix, 8),
      value: Math.round(value),
      autoGrow: {
        enabled,
        perDay: Math.round(toNumber(grow.perDay, 1)),
        startDate: enabled ? startDate : null,
      },
      order: Math.round(toNumber(body.order, 0)),
      isActive: body.isActive !== false && body.isActive !== "false",
    },
  };
}
