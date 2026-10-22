// Helpers for an order's production log. Kept apart from the model so both the
// API routes that write entries and the one that reads them agree on the shape.

// Adds one step to the order's history. The caller still has to save the order.
export function addHistory(order, { status, note = "", by = "System", at } = {}) {
  if (!order) return;
  if (!Array.isArray(order.statusHistory)) order.statusHistory = [];

  order.statusHistory.push({
    status: String(status || order.status || ""),
    note: String(note || ""),
    by: String(by || "System"),
    at: at || new Date(),
  });
}

// The log a buyer sees: the recorded steps, plus the courier's own scans.
// Orders placed before the history existed still get a readable log, built
// from the dates the order itself carries.
export function buildTimeline(order) {
  if (!order) return [];

  const steps = (order.statusHistory || []).map((entry) => ({
    status: entry.status || "",
    note: entry.note || "",
    by: entry.by || "System",
    at: entry.at,
  }));

  if (steps.length === 0) {
    steps.push({
      status: "Order Booked",
      note: `Order placed${order.orderNumber ? ` (#${order.orderNumber})` : ""}`,
      by: "Customer",
      at: order.createdAt,
    });

    // Anything beyond the first step was not recorded at the time, so the log
    // shows where the order stands now rather than inventing the steps between.
    if (order.status && order.status !== "Pending" && order.status !== "Order Received") {
      steps.push({
        status: order.status,
        note: "Current stage",
        by: "System",
        at: order.updatedAt || order.createdAt,
      });
    }
  }

  for (const scan of order.shipment?.trackingHistory || []) {
    steps.push({
      status: scan.status || "Courier update",
      note: [scan.activity, scan.location].filter(Boolean).join(" — "),
      by: order.shipment?.courierName || "Courier",
      at: scan.date,
    });
  }

  if (order.deliveredAt) {
    const alreadyThere = steps.some((s) => s.status === "Order Delivered");
    if (!alreadyThere) {
      steps.push({
        status: "Order Delivered",
        note: "Delivered to the address on the order",
        by: "Courier",
        at: order.deliveredAt,
      });
    }
  }

  return steps
    .filter((s) => s.at)
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

// Every file attached to an order: what the buyer uploaded with each item, the
// files they re-uploaded later, and the delivery challan where there is one.
export function buildFileHistory(order) {
  if (!order) return [];

  const files = [];
  const nameOf = (url) => String(url || "").split("/").pop() || "file";

  (order.items || []).forEach((item, index) => {
    const product = item.product?.name || `Item ${index + 1}`;

    (item.uploadedFiles || []).forEach((url) => {
      files.push({
        name: nameOf(url),
        url,
        url_label: "Print file",
        belongsTo: product,
        uploadedBy: "Customer",
        at: order.createdAt,
      });
    });

    (item.uploadedAttributeFiles || []).forEach((file) => {
      if (!file?.url) return;
      files.push({
        name: file.name || nameOf(file.url),
        url: file.url,
        url_label: file.attributeName || "Attachment",
        belongsTo: product,
        uploadedBy: "Customer",
        at: order.createdAt,
      });
    });
  });

  (order.reuploadedFiles || []).forEach((file) => {
    if (!file?.fileUrl) return;
    files.push({
      name: nameOf(file.fileUrl),
      url: file.fileUrl,
      url_label: "Re-uploaded design",
      belongsTo: "",
      uploadedBy: "Customer",
      at: file.uploadedAt,
    });
  });

  if (order.deliveryChallan?.fileUrl) {
    files.push({
      name: nameOf(order.deliveryChallan.fileUrl),
      url: order.deliveryChallan.fileUrl,
      url_label: "Delivery challan",
      belongsTo: "",
      uploadedBy: "One Prime Studios",
      at: order.deliveryChallan.uploadedAt,
    });
  }

  return files;
}
