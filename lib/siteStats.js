// lib/siteStats.js — works out the figure the storefront prints for a stat,
// so the public API and the admin preview never disagree.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole days from the start date until today. Never negative, so a start date
// in the future simply shows the starting figure until that date arrives.
export const daysSince = (startDate, now = Date.now()) => {
  const start = startDate ? new Date(startDate).getTime() : NaN;
  if (!Number.isFinite(start)) return 0;
  const days = Math.floor((now - start) / MS_PER_DAY);
  return days > 0 ? days : 0;
};

// The number shown right now: the stored figure, plus the daily growth when
// auto-grow is switched on.
export const computeStatValue = (stat, now = Date.now()) => {
  const base = Number(stat?.value);
  const safeBase = Number.isFinite(base) ? base : 0;
  if (!stat?.autoGrow?.enabled) return Math.round(safeBase);

  const perDay = Number(stat.autoGrow.perDay);
  if (!Number.isFinite(perDay) || perDay === 0) return Math.round(safeBase);

  const grown = safeBase + daysSince(stat.autoGrow.startDate, now) * perDay;
  return Math.max(0, Math.round(grown));
};

// What the storefront needs, with the maths already done server-side.
export const toPublicStat = (stat, now = Date.now()) => ({
  _id: String(stat._id),
  label: stat.label || "",
  note: stat.note || "",
  prefix: stat.prefix || "",
  suffix: stat.suffix || "",
  value: computeStatValue(stat, now),
});
