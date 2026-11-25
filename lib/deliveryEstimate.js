// Estimated delivery dates for retail (B2C) orders.
//
// An estimate is two parts added together: the days we need to get the order
// ready and handed to the courier, then the days the courier needs to reach
// the PIN code. This file is plain date arithmetic with no database or network
// access, so the product page, the checkout, the order pages and the APIs all
// work the dates out the same way.

export const DEFAULT_DISPATCH_DAYS = 2;
export const MAX_DISPATCH_DAYS = 30;
// Used when the courier cannot be asked: no PIN code yet, or no live quote
export const DEFAULT_TRANSIT_DAYS = { min: 3, max: 7 };
const MAX_TRANSIT_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Every date is pinned to noon, India time, of its calendar day. The day then
// reads the same on a server running in UTC and on a phone in India.
const istNoon = (value) => {
  const shifted = new Date(new Date(value).getTime() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), 6, 30)
  );
};

const istWeekday = (date) => new Date(date.getTime() + IST_OFFSET_MS).getUTCDay();

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

// Preparation happens on working days, so Sundays are stepped over
const addWorkingDays = (date, days) => {
  let current = date;
  let left = days;
  while (left > 0) {
    current = addDays(current, 1);
    if (istWeekday(current) !== 0) left -= 1;
  }
  return current;
};

const isValidDate = (value) => {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
};

// The days a product needs before dispatch, as set by the admin
export const productDispatchDays = (product) => {
  const raw = product?.dispatchDays;
  if (raw === undefined || raw === null || raw === "") return DEFAULT_DISPATCH_DAYS;
  const days = Math.round(Number(raw));
  if (!Number.isFinite(days) || days < 0) return DEFAULT_DISPATCH_DAYS;
  return Math.min(days, MAX_DISPATCH_DAYS);
};

// A cart ships together, so it is ready when its slowest item is ready
export const cartDispatchDays = (products) => {
  const list = (products || []).filter(Boolean);
  if (!list.length) return DEFAULT_DISPATCH_DAYS;
  return Math.max(...list.map(productDispatchDays));
};

// The courier's quoted delivery date ("Nov 18, 2026") as days from today.
// Returns 0 when the text cannot be read as a sensible date.
export const transitDaysFromEtd = (etd, now = new Date()) => {
  if (!etd || !isValidDate(etd)) return 0;
  const days = Math.round((istNoon(etd).getTime() - istNoon(now).getTime()) / DAY_MS);
  return days >= 1 && days <= MAX_TRANSIT_DAYS ? days : 0;
};

// The fastest and the slowest courier quote give the transit range. With no
// usable quote the default range is used and the estimate is marked approximate.
export const transitRange = (etds, now = new Date()) => {
  const days = (etds || []).map((etd) => transitDaysFromEtd(etd, now)).filter((d) => d > 0);
  if (!days.length) return { ...DEFAULT_TRANSIT_DAYS, live: false };
  const min = Math.min(...days);
  // A single quote is widened by a day; a promise of one exact date is easy to miss
  const max = Math.max(Math.max(...days), min + 1);
  return { min, max, live: true };
};

// Builds the estimate. Dates come back as ISO strings so the result can be
// sent over an API or stored on an order as it is.
export function buildEstimate({ dispatchDays, transit, now = new Date() } = {}) {
  const prep = Number.isFinite(Number(dispatchDays)) ? Math.max(0, Number(dispatchDays)) : DEFAULT_DISPATCH_DAYS;
  const range = transit && transit.min > 0 ? transit : { ...DEFAULT_TRANSIT_DAYS, live: false };
  const dispatchBy = addWorkingDays(istNoon(now), prep);
  return {
    dispatchBy: dispatchBy.toISOString(),
    from: addDays(dispatchBy, range.min).toISOString(),
    to: addDays(dispatchBy, Math.max(range.min, range.max)).toISOString(),
    approximate: !range.live,
  };
}

const DAY_FORMAT = { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" };

export const formatEstimateDay = (value) =>
  isValidDate(value) ? new Date(value).toLocaleDateString("en-IN", DAY_FORMAT) : "";

const sameDay = (a, b) => istNoon(a).getTime() === istNoon(b).getTime();

// "Tue, 17 Nov" or "Tue, 17 Nov - Fri, 20 Nov"
export const formatEstimateRange = (estimate) => {
  if (!estimate || !isValidDate(estimate.to)) return "";
  if (!isValidDate(estimate.from) || sameDay(estimate.from, estimate.to)) {
    return formatEstimateDay(estimate.to);
  }
  return `${formatEstimateDay(estimate.from)} - ${formatEstimateDay(estimate.to)}`;
};

const DELIVERED = ["Order Delivered", "Delivered"];
const STOPPED = ["Cancelled", "Rejected"];
const ON_THE_WAY = ["Order Dispatched", "Shipped"];

// What to tell the buyer about one order's delivery, at whatever stage it is.
// Returns null when there is nothing honest to say (a cancelled order, or an
// old order placed before estimates were kept).
//   tone: "done" | "late" | "normal"
export function orderDeliveryView(order, now = new Date()) {
  if (!order || STOPPED.includes(order.status)) return null;

  if (DELIVERED.includes(order.status)) {
    const on = formatEstimateDay(order.deliveredAt);
    return { tone: "done", title: "Delivered", text: on ? `Delivered on ${on}` : "Delivered" };
  }

  const shipped = ON_THE_WAY.includes(order.status);
  const title = shipped ? "On the way" : "Estimated delivery";

  // Once a courier is booked its own date is the better promise
  const courierDate = order.shipment?.expectedDeliveryDate;
  const estimate = isValidDate(courierDate)
    ? { from: courierDate, to: courierDate }
    : isValidDate(order.estimatedDelivery?.to)
    ? order.estimatedDelivery
    : null;
  if (!estimate) return null;

  // A day of grace before an order is called late
  if (istNoon(now).getTime() > addDays(istNoon(estimate.to), 1).getTime()) {
    return {
      tone: "late",
      title: "Running late",
      text: `Expected by ${formatEstimateDay(estimate.to)}. It is taking longer than planned and should reach you soon.`,
    };
  }

  const range = formatEstimateRange(estimate);
  const single = !isValidDate(estimate.from) || sameDay(estimate.from, estimate.to);
  return { tone: "normal", title, text: single ? `Arriving by ${range}` : `Arriving ${range}` };
}
