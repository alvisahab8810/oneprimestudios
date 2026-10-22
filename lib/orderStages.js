// The order stages a buyer can filter by. Every label here is the exact status
// the office sets on an order, so what the buyer reads on a tab is what the
// admin picked in the status dropdown — nothing is renamed on the way out.
//
// A few older statuses are still on records from before the current list, so
// each stage also collects its legacy equivalents and the counts stay right.
export const ORDER_STAGES = [
  { id: "pending", label: "Pending", statuses: ["Pending"] },
  { id: "order-received", label: "Order Received", statuses: ["Order Received"] },
  { id: "design-approved", label: "Design Approved", statuses: ["Design Approved"] },
  { id: "design-rejected", label: "Design Rejected", statuses: ["Design Rejected", "Rejected"] },
  { id: "in-progress", label: "In Progress", statuses: ["In Progress", "Processing", "Printing"] },
  { id: "order-ready", label: "Order Ready", statuses: ["Order Ready"] },
  { id: "in-packaging", label: "In Packaging", statuses: ["In Packaging"] },
  { id: "order-dispatched", label: "Order Dispatched", statuses: ["Order Dispatched", "Shipped"] },
  { id: "order-delivered", label: "Order Delivered", statuses: ["Order Delivered", "Delivered"] },
  { id: "cancelled", label: "Cancelled", statuses: ["Cancelled"] },
];

export function getStage(id) {
  return ORDER_STAGES.find((stage) => stage.id === id) || null;
}

export function stageOfStatus(status) {
  if (!status) return null;
  return ORDER_STAGES.find((stage) => stage.statuses.includes(status)) || null;
}

// The label for a status. An unknown one — a step in the production log that is
// not an order status, say — is handed back as it is.
export function stageLabel(status) {
  return stageOfStatus(status)?.label || status || "";
}
