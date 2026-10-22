// The stages a buyer sees on the Order Status screens. Several internal
// statuses mean the same thing to a customer, so each stage lists the ones it
// covers. No imports here, so this file is safe on the client too.

export const ORDER_STAGES = [
  {
    id: "booked",
    label: "Order Booked",
    statuses: ["Pending", "Order Received"],
  },
  {
    id: "design-approved",
    label: "Design Approved",
    statuses: ["Design Approved"],
  },
  {
    id: "design-rejected",
    label: "Improper Order",
    statuses: ["Design Rejected", "Rejected"],
  },
  {
    id: "under-process",
    label: "Under Process",
    statuses: ["In Progress", "Processing", "Printing"],
  },
  {
    id: "ready",
    label: "Order Ready",
    statuses: ["Order Ready"],
  },
  {
    id: "packing",
    label: "Under Packing",
    statuses: ["In Packaging"],
  },
  {
    id: "dispatched",
    label: "Dispatched",
    statuses: ["Order Dispatched", "Shipped"],
  },
  {
    id: "delivered",
    label: "Delivered",
    statuses: ["Order Delivered", "Delivered"],
  },
  {
    id: "cancelled",
    label: "Cancelled",
    statuses: ["Cancelled"],
  },
];

export function getStage(id) {
  return ORDER_STAGES.find((s) => s.id === id) || null;
}

// Which stage an order is sitting in right now
export function stageOfStatus(status) {
  const value = String(status || "");
  return ORDER_STAGES.find((s) => s.statuses.includes(value)) || null;
}

export function stageLabel(status) {
  return stageOfStatus(status)?.label || String(status || "Pending");
}
