// pages/api/admin/invoices/index.js
// GET — list invoices with filters + stats + per-party summary
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();

    const { status, partnerType, search, page = 1, limit = 20, summary, fromDate, toDate } = req.query;

    // Shared date-range filter on createdAt (the "Invoice Date" column shown in the UI).
    // toDate is inclusive of the whole day.
    const dateFilter = {};
    if (fromDate) {
      const d = new Date(fromDate);
      if (!isNaN(d)) { d.setHours(0, 0, 0, 0); dateFilter.$gte = d; }
    }
    if (toDate) {
      const d = new Date(toDate);
      if (!isNaN(d)) { d.setHours(23, 59, 59, 999); dateFilter.$lte = d; }
    }

    // ── Summary mode: return stats for dashboard ──────────────────────────────
    if (summary === "true") {
      const summaryFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};
      const all = await Invoice.find(summaryFilter).lean();

      const totalInvoices   = all.length;
      const totalBilling    = all.reduce((s, i) => s + (i.grandTotal || 0), 0);
      const totalTaxable    = all.reduce((s, i) => s + (i.taxableValue || i.subTotal || 0), 0);
      const totalTax        = all.reduce((s, i) => s + (i.gstAmount || 0), 0);
      const totalCgst       = all.reduce((s, i) => s + (i.cgstAmount || 0), 0);
      const totalSgst       = all.reduce((s, i) => s + (i.sgstAmount || 0), 0);
      const totalIgst       = all.reduce((s, i) => s + (i.igstAmount || 0), 0);
      // const b2bCount        = all.filter(i => i.partnerType === "B2B").length;
      // const b2cCount        = all.filter(i => i.partnerType === "B2C").length;
      // const noGstCount      = all.filter(i => i.partnerType === "UNREGISTERED" || i.gstType === "NONE").length;
      // const draftCount      = all.filter(i => i.status === "DRAFT").length;
      // const sentCount       = all.filter(i => i.status === "SENT").length;

      // NEW — legacy invoices without partnerType default to B2B
      const resolveType = (i) => i.partnerType || "B2B";
      const b2bCount   = all.filter(i => resolveType(i) === "B2B").length;
      const b2cCount   = all.filter(i => resolveType(i) === "B2C").length;
      const noGstCount = all.filter(i => resolveType(i) === "UNREGISTERED" || i.gstType === "NONE").length;
      const draftCount = all.filter(i => i.status === "DRAFT").length;
      const sentCount  = all.filter(i => i.status === "SENT").length;

      // Per-party summary
      const partyMap = {};
      all.forEach(inv => {
        const key = String(inv.partnerId);
        if (!partyMap[key]) {
          partyMap[key] = {
            partnerId:   inv.partnerId,
            partnerName: inv.partnerName,
            // partnerType: inv.partnerType,
            partnerType: inv.partnerType || "B2B",
            gst:         inv.partnerAddress?.gst || "",
            count:       0,
            totalBilling: 0,
            totalTaxable: 0,
            totalTax:     0,
          };
        }
        partyMap[key].count++;
        partyMap[key].totalBilling += inv.grandTotal || 0;
        partyMap[key].totalTaxable += inv.taxableValue || inv.subTotal || 0;
        partyMap[key].totalTax     += inv.gstAmount || 0;
      });

      return res.status(200).json({
        stats: {
          totalInvoices, totalBilling, totalTaxable, totalTax,
          totalCgst, totalSgst, totalIgst,
          b2bCount, b2cCount, noGstCount, draftCount, sentCount,
        },
        partySummary: Object.values(partyMap).sort((a, b) => b.totalBilling - a.totalBilling),
      });
    }

    // ── Normal list mode ──────────────────────────────────────────────────────
    const filter = {};
    if (status)      filter.status      = status;
    if (partnerType) filter.partnerType = partnerType;
    if (Object.keys(dateFilter).length) filter.createdAt = dateFilter;

    const pageNum  = Math.max(1, Number(page));
    const limitNum = Number(limit);
    const skip     = (pageNum - 1) * limitNum;

    let invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    if (search) {
      const q = search.toLowerCase();
      invoices = invoices.filter(i =>
        i.invoiceNumber?.toLowerCase().includes(q) ||
        i.orderNumber?.toLowerCase().includes(q) ||
        i.partnerName?.toLowerCase().includes(q) ||
        i.partnerAddress?.gst?.toLowerCase().includes(q)
      );
    }

    const total = await Invoice.countDocuments(filter);

    return res.status(200).json({
      invoices,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
    });

  } catch (error) {
    console.error("INVOICE LIST ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
}


// import dbConnect from "@/lib/dbConnect";
// import Invoice from "@/models/Invoice";

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   try {
//     await dbConnect();

//     const invoices = await Invoice.find()
//       .sort({ createdAt: -1 });

//     return res.status(200).json(invoices);

//   } catch (error) {
//     console.error("ADMIN INVOICE LIST ERROR:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// }
