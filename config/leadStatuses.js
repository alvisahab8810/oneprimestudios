// The stages a contact lead moves through. Kept in one place so the model, the
// API and the admin screen can never drift apart.
export const LEAD_STATUSES = [
  "New",
  "Pending",
  "Under Review",
  "Processing",
  "Converted",
  "Closed",
];

export const DEFAULT_LEAD_STATUS = "New";

// Badge colours: text, background and border for each stage
export const LEAD_STATUS_STYLES = {
  "New": { color: "#1A71F6", bg: "#eaf2ff", border: "#c7ddff" },
  "Pending": { color: "#b45309", bg: "#fff7e6", border: "#fde3b0" },
  "Under Review": { color: "#7c3aed", bg: "#f5f0ff", border: "#ddd0fb" },
  "Processing": { color: "#0e7490", bg: "#e8f8fb", border: "#bae6ef" },
  "Converted": { color: "#15803d", bg: "#eaf7ee", border: "#bfe3cb" },
  "Closed": { color: "#6b7280", bg: "#f4f5f7", border: "#e2e4e8" },
};

export const leadStatusStyle = (status) =>
  LEAD_STATUS_STYLES[status] || LEAD_STATUS_STYLES[DEFAULT_LEAD_STATUS];
