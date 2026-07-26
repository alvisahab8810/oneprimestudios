// utils/gstBreakdown.js
// Groups invoice line items by their own GST% (set per-product) and computes
// CGST/SGST/IGST per rate slab, instead of applying one invoice-wide rate.
// Shared by the create/edit invoice pages, their APIs, and PDF generation.

export function computeGstBreakdown(items, gstType) {
  const groups = {};

  for (const item of items || []) {
    const rate = Number(item.gstPercent || 0);
    const taxable = Number(item.amount ?? item.taxableAmount ?? (item.qty * item.rate) ?? 0);
    if (!groups[rate]) groups[rate] = { rate, taxable: 0 };
    groups[rate].taxable += taxable;
  }

  const rows = Object.values(groups)
    .sort((a, b) => a.rate - b.rate)
    .map((g) => {
      let cgst = 0, sgst = 0, igst = 0;
      if (gstType === "INTRA") {
        cgst = (g.taxable * g.rate) / 200;
        sgst = cgst;
      } else if (gstType === "INTER") {
        igst = (g.taxable * g.rate) / 100;
      }
      return {
        rate: g.rate,
        taxable: g.taxable,
        cgstPercent: gstType === "INTRA" ? g.rate / 2 : 0,
        sgstPercent: gstType === "INTRA" ? g.rate / 2 : 0,
        igstPercent: gstType === "INTER" ? g.rate : 0,
        cgst, sgst, igst,
        tax: cgst + sgst + igst,
      };
    });

  const totals = rows.reduce(
    (acc, r) => ({
      taxable: acc.taxable + r.taxable,
      cgst: acc.cgst + r.cgst,
      sgst: acc.sgst + r.sgst,
      igst: acc.igst + r.igst,
      tax: acc.tax + r.tax,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 }
  );

  return { rows, totals };
}
