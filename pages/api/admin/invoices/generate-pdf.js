// pages/api/admin/invoices/generate-pdf.js
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { computeGstBreakdown } from "@/utils/gstBreakdown";

// ── One Prime Studios constants ───────────────────────────────────────────────
const OPS = {
  name:    "One Prime Studios",
  address: "591/eya/19 kumhar mandi, Kharika telibagh Lucknow",
  phone:   "8081815141",
  email:   "admin@oneprimestudios.com",
  gstin:   "09CORPG5317P1Z6",
  state:   "09-Uttar Pradesh",
  bank: {
    name:          "UCO BANK, VRINDAVAN YOJNA",
    accountNo:     "31350210001073",
    ifsc:          "UCBA0003135",
    accountHolder: "ONE PRIME STUDIOS",
  },
};

// ── Amount in words (Indian numbering) ────────────────────────────────────────
function amountInWords(amount) {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

  function convert(n) {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n/10)] + " " + ones[n%10] + " ";
    if (n < 1000) return ones[Math.floor(n/100)] + " Hundred " + convert(n%100);
    if (n < 100000) return convert(Math.floor(n/1000)) + "Thousand " + convert(n%1000);
    if (n < 10000000) return convert(Math.floor(n/100000)) + "Lakh " + convert(n%100000);
    return convert(Math.floor(n/10000000)) + "Crore " + convert(n%10000000);
  }

  const rounded = Math.round(amount);
  const paise   = Math.round((amount - rounded) * 100);
  let words = convert(rounded).trim() + " Rupees";
  if (paise > 0) words += " and " + convert(paise).trim() + " Paise";
  return words + " only";
}

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    await dbConnect();

    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ message: "invoiceId required" });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const inv    = invoice.toObject ? invoice.toObject() : invoice;
    const bill   = inv.partnerAddress || {};
    const ship   = inv.shipToAddress  || bill;
    const invDate = inv.invoiceDate ? new Date(inv.invoiceDate) : new Date(inv.createdAt);
    const dateStr = invDate.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

    // ── Embed logo as base64 so Puppeteer renders it ──────────────────────────
    const logoPath = path.join(process.cwd(), "public", "assets", "images", "logo.png");
    let logoBase64 = "";
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    } catch {
      // logo not found — will fall back to text name
    }

    // Older invoices saved before per-item GST% existed fall back to the invoice-wide rate.
    const itemsWithGst = (inv.items || []).map((it) => ({
      ...it,
      gstPercent: it.gstPercent ?? inv.gstPercent ?? 0,
    }));
    const distinctRates = [...new Set(itemsWithGst.map((it) => Number(it.gstPercent || 0)))];
    const { rows: gstRows } = inv.gstType !== "NONE"
      ? computeGstBreakdown(itemsWithGst, inv.gstType)
      : { rows: [] };

    // ── Item rows — each item taxed at its own product-wise GST % ────────────
    const itemRows = itemsWithGst.map((item, i) => {
      const taxable = Number(item.taxableAmount || (item.qty * item.rate) || 0);
      const rate = Number(item.gstPercent || 0);
      const cgst = inv.gstType === "INTRA" ? (taxable * rate) / 200 : 0;
      const sgst = inv.gstType === "INTRA" ? (taxable * rate) / 200 : 0;
      const igst = inv.gstType === "INTER" ? (taxable * rate) / 100 : 0;
      const total = taxable + cgst + sgst + igst;

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${item.description || "—"}</td>
          <td>${item.hsnCode || "—"}</td>
          <td class="r">${item.qty}</td>
          <td class="r">₹${fmt(item.rate)}</td>
          <td class="r">₹${fmt(taxable)}</td>
          <td class="r">${rate}%</td>
          ${inv.gstType === "INTRA"
            ? `<td class="r">₹${fmt(cgst)}</td><td class="r">₹${fmt(sgst)}</td>`
            : inv.gstType === "INTER"
              ? `<td class="r" colspan="2">₹${fmt(igst)}</td>`
              : `<td class="r" colspan="2">—</td>`}
          <td class="r"><strong>₹${fmt(total)}</strong></td>
        </tr>`;
    }).join("");

    // ── Tax summary rows — one row per distinct GST rate present in the invoice ─
    const taxSummaryRows = inv.gstType === "INTRA"
      ? gstRows.filter(g => g.rate > 0).map(g =>
          `<tr><td>SGST</td><td class="r">₹${fmt(g.taxable)}</td><td class="r">${g.sgstPercent}%</td><td class="r">₹${fmt(g.sgst)}</td></tr>
           <tr><td>CGST</td><td class="r">₹${fmt(g.taxable)}</td><td class="r">${g.cgstPercent}%</td><td class="r">₹${fmt(g.cgst)}</td></tr>`
        ).join("") || `<tr><td colspan="4" class="r">No GST applicable</td></tr>`
      : inv.gstType === "INTER"
        ? gstRows.filter(g => g.rate > 0).map(g =>
            `<tr><td>IGST</td><td class="r">₹${fmt(g.taxable)}</td><td class="r">${g.igstPercent}%</td><td class="r">₹${fmt(g.igst)}</td></tr>`
          ).join("") || `<tr><td colspan="4" class="r">No GST applicable</td></tr>`
        : `<tr><td colspan="4" class="r">No GST applicable</td></tr>`;

    const gstColHeader = inv.gstType === "INTRA"
      ? `<th class="r">CGST</th><th class="r">SGST</th>`
      : `<th class="r" colspan="2">IGST</th>`;

    // Invoices above ₹50,000 print in a strict black & white layout —
    // no rounded corners, no fills, no colors at all. Same data, plain look.
    const isHighValue = Number(inv.grandTotal || 0) > 50000;
    const bw  = isHighValue;
    const rad = (px) => (bw ? "0px" : `${px}px`);
    const ink        = "#000";
    const muted      = bw ? "#000" : "#555";
    const mutedSoft  = bw ? "#000" : "#666";
    const label      = bw ? "#000" : "#888";
    const faint      = bw ? "#000" : "#999";
    const lineGray   = bw ? "#000" : "#ddd";
    const dividerCol = bw ? "#000" : "#eee";
    const boxFill    = bw ? "#fff" : "#fafafa";
    const rowFill    = bw ? "#fff" : "#f9fafb";
    const headerBg     = bw ? "#fff" : "#1a1a1a";
    const headerColor  = bw ? "#000" : "#fff";
    const headerBorder = bw ? "1.5px solid #000" : "none";
    const badgeBg     = bw ? "transparent" : "#111";
    const badgeColor  = bw ? "#000" : "#fff";
    const badgeBorder = bw ? "1.5px solid #000" : "none";
    const accentGreen = bw ? "#000" : "#16a34a";

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11.5px; color: ${ink}; padding: 28px 32px; background: #fff; }
  .original { text-align: right; font-size: 9px; color: ${faint}; margin-bottom: 6px; letter-spacing: 0.05em; text-transform: uppercase; }
  .header   { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
  .company-name { font-size: 20px; font-weight: 900; color: ${ink}; letter-spacing: -0.5px; margin-bottom: 4px; }
  .company-info { font-size: 10.5px; color: ${muted}; line-height: 1.7; max-width: 280px; }
  .invoice-badge { display: inline-block; background: ${badgeBg}; color: ${badgeColor}; border: ${badgeBorder}; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; padding: 4px 14px; border-radius: ${rad(4)}; margin-bottom: 10px; }
  .invoice-num { font-size: 18px; font-weight: 900; color: ${ink}; margin-bottom: 4px; }
  .invoice-meta { font-size: 11px; color: ${mutedSoft}; margin-bottom: 2px; }
  .invoice-meta strong { color: ${ink}; }
  .divider { border: none; border-top: 1.5px solid ${dividerCol}; margin: 14px 0; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; border: 1px solid ${lineGray}; border-radius: ${rad(6)}; overflow: hidden; margin-bottom: 14px; }
  .three-col > div { padding: 10px 13px; border-right: 1px solid ${lineGray}; background: ${boxFill}; }
  .three-col > div:last-child { border-right: none; }
  .col-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: ${label}; margin-bottom: 6px; }
  .col-name  { font-size: 12px; font-weight: 700; color: ${ink}; margin-bottom: 3px; }
  .col-info  { font-size: 10.5px; color: ${muted}; line-height: 1.7; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 10px; border-radius: ${rad(6)}; overflow: hidden; ${bw ? "border: 1px solid #000;" : ""} }
  table.items thead tr { background: ${headerBg}; color: ${headerColor}; ${bw ? `border-bottom: ${headerBorder};` : ""} }
  table.items th { padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  table.items td { padding: 7px 10px; border-bottom: 1px solid ${bw ? "#000" : "#f0f0f0"}; font-size: 11px; vertical-align: top; }
  table.items tbody tr:last-child td { border-bottom: 2px solid ${ink}; font-weight: 700; background: ${rowFill}; }
  .r { text-align: right; }
  .tax-box { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .tax-box > div { border: 1px solid ${lineGray}; border-radius: ${rad(6)}; overflow: hidden; }
  table.tax-summary { width: 100%; border-collapse: collapse; }
  table.tax-summary th { background: ${headerBg}; color: ${headerColor}; padding: 7px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; ${bw ? `border-bottom: ${headerBorder};` : ""} }
  table.tax-summary td { padding: 5px 10px; border-bottom: 1px solid ${bw ? "#000" : "#f0f0f0"}; font-size: 11px; }
  .amounts-header { background: ${headerBg}; color: ${headerColor}; padding: 7px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; ${bw ? `border-bottom: ${headerBorder};` : ""} }
  table.amounts { width: 100%; border-collapse: collapse; }
  table.amounts td { padding: 5px 10px; font-size: 11.5px; border-bottom: 1px solid ${bw ? "#000" : "#f0f0f0"}; }
  .grand-row td { font-weight: 800; font-size: 13px; border-top: 2px solid ${ink}; padding-top: 8px; }
  .words-box { border: 1px solid ${lineGray}; border-radius: ${rad(6)}; padding: 8px 12px; margin-bottom: 10px; font-size: 11px; }
  .words-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: ${label}; margin-bottom: 4px; }
  .section-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: ${headerColor}; background: ${headerBg}; padding: 5px 10px; border-radius: ${bw ? "0px" : "4px 4px 0 0"}; ${bw ? `border: ${headerBorder};` : ""} }
  .decl-box { border: 1px solid ${lineGray}; border-top: none; border-radius: ${bw ? "0px" : "0 0 4px 4px"}; padding: 8px 10px; font-size: 10.5px; color: ${muted}; line-height: 1.7; }
  .footer-row { display: flex; justify-content: space-between; align-items: flex-end; }
  .sign-box { text-align: right; font-size: 11px; }
  .sign-line { border-top: 1.5px solid ${ink}; margin-top: 36px; padding-top: 5px; min-width: 180px; display: inline-block; font-weight: 700; font-size: 11px; }
</style>
</head>
<body>

<div class="original">Original for Recipient</div>

<!-- Header -->
<div class="header">
  <div>
    ${logoBase64
      ? `<img src="${logoBase64}" alt="One Prime Studios" style="height:56px;margin-bottom:10px;display:block"/>`
      : `<div class="company-name">${OPS.name}</div>`}
    <div class="company-info">
      ${OPS.address}<br/>
      Ph: ${OPS.phone} &nbsp;|&nbsp; ${OPS.email}<br/>
      GSTIN: <strong>${OPS.gstin}</strong> &nbsp;|&nbsp; State: ${OPS.state}
    </div>
  </div>
  <div style="text-align:right">
    <div class="invoice-badge">Tax Invoice</div>
    <div class="invoice-num">${inv.invoiceNumber}</div>
    <div class="invoice-meta">Date: <strong>${dateStr}</strong></div>
    <div class="invoice-meta">Order(s): <strong>${(inv.orderNumbers || [inv.orderNumber]).join(", ")}</strong></div>
  </div>
</div>
<hr class="divider"/>

<!-- Bill To | Ship To | GST Info -->
<div class="three-col">
  <div>
    <div class="col-label">Bill To</div>
    <div class="col-name">${bill.name || inv.partnerName || "—"}</div>
    <div class="col-info">
      ${bill.companyName ? `${bill.companyName}<br/>` : ""}
      ${bill.street     ? `${bill.street}<br/>` : ""}
      ${[bill.city, bill.state, bill.zip].filter(Boolean).join(", ")}
      ${bill.gst ? `<br/>GSTIN: <strong>${bill.gst}</strong>` : ""}
      ${bill.phone ? `<br/>Ph: ${bill.phone}` : ""}
      ${bill.email ? `<br/>${bill.email}` : ""}
    </div>
  </div>
  <div>
    <div class="col-label">Ship To (Consignee)</div>
    <div class="col-name">${ship.name || bill.name || "—"}</div>
    <div class="col-info">
      ${ship.companyName ? `${ship.companyName}<br/>` : ""}
      ${ship.street      ? `${ship.street}<br/>` : ""}
      ${[ship.city, ship.state, ship.zip].filter(Boolean).join(", ")}
      ${ship.gst ? `<br/>GSTIN: <strong>${ship.gst}</strong>` : ""}
      ${ship.phone ? `<br/>Ph: ${ship.phone}` : ""}
    </div>
  </div>
  <div>
    <div class="col-label">GST / Tax Info</div>
    <div class="col-info">
      <strong>GST Type:</strong> ${inv.gstType || "INTRA"}<br/>
      ${inv.gstType === "NONE"
        ? "No GST applicable"
        : distinctRates.length > 1
          ? `<strong>Rates:</strong> ${distinctRates.slice().sort((a,b)=>a-b).map(r=>`${r}%`).join(", ")} (product-wise)`
          : inv.gstType === "INTRA"
            ? `<strong>CGST:</strong> ${(distinctRates[0]||0)/2}% &nbsp; <strong>SGST:</strong> ${(distinctRates[0]||0)/2}%`
            : `<strong>IGST:</strong> ${distinctRates[0]||0}%`}
      <br/><strong>Seller GSTIN:</strong> ${OPS.gstin}
    </div>
  </div>
</div>

<!-- Items Table -->
<table class="items">
  <thead>
    <tr>
      <th>#</th>
      <th>Item Name</th>
      <th>HSN/SAC</th>
      <th class="r">Qty</th>
      <th class="r">Rate</th>
      <th class="r">Taxable Amt</th>
      <th class="r">GST %</th>
      ${gstColHeader}
      <th class="r">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
    <tr style="font-weight:700;background:${rowFill}">
      <td colspan="3"><strong>Total</strong></td>
      <td class="r">${inv.items.reduce((s,i)=>s+Number(i.qty||0),0)}</td>
      <td></td>
      <td class="r"><strong>₹${fmt(inv.taxableValue || inv.subTotal)}</strong></td>
      <td></td>
      ${inv.gstType === "INTRA"
        ? `<td class="r"><strong>₹${fmt(inv.cgstAmount)}</strong></td><td class="r"><strong>₹${fmt(inv.sgstAmount)}</strong></td>`
        : inv.gstType === "INTER"
          ? `<td class="r" colspan="2"><strong>₹${fmt(inv.igstAmount)}</strong></td>`
          : `<td class="r" colspan="2">—</td>`}
      <td class="r"><strong>₹${fmt(inv.grandTotal)}</strong></td>
    </tr>
  </tbody>
</table>

<!-- Tax Summary + Amounts -->
<div class="tax-box">
  <div>
    <div class="section-label">Tax Breakdown</div>
    <table class="tax-summary">
      <thead><tr>
        <th>Tax Type</th>
        <th class="r">Taxable Amt</th>
        <th class="r">Rate</th>
        <th class="r">Tax Amt</th>
      </tr></thead>
      <tbody>${taxSummaryRows}</tbody>
    </table>
  </div>
  <div>
    <div class="amounts-header">Amount Summary</div>
    <table class="amounts">
      <tr><td>Taxable Value</td><td class="r">₹${fmt(inv.taxableValue || inv.subTotal)}</td></tr>
      ${gstRows.filter(g => g.rate > 0).map(g =>
        inv.gstType === "INTRA"
          ? `<tr><td>CGST @ ${g.cgstPercent}%</td><td class="r">₹${fmt(g.cgst)}</td></tr>
             <tr><td>SGST @ ${g.sgstPercent}%</td><td class="r">₹${fmt(g.sgst)}</td></tr>`
          : inv.gstType === "INTER"
            ? `<tr><td>IGST @ ${g.igstPercent}%</td><td class="r">₹${fmt(g.igst)}</td></tr>`
            : ""
      ).join("")}
      <tr><td>Total Tax</td><td class="r">₹${fmt(inv.gstAmount)}</td></tr>
      ${(() => {
        const saved    = Number(inv.couponDiscount || 0);
        const inferred = Math.round(((inv.subTotal || 0) + (inv.gstAmount || 0) - (inv.grandTotal || 0)) * 100) / 100;
        const discount = saved > 0 ? saved : (inferred > 0.001 ? inferred : 0);
        if (!discount) return "";
        return `<tr><td style="color:${accentGreen};font-weight:600">Coupon Discount${inv.couponCode ? ` (${inv.couponCode})` : ""}</td><td class="r" style="color:${accentGreen};font-weight:600">− ₹${fmt(discount)}</td></tr>`;
      })()}
      <tr class="grand-row"><td>Grand Total</td><td class="r">₹${fmt(inv.grandTotal)}</td></tr>
    </table>
  </div>
</div>

<!-- Amount in Words -->
<div class="words-box" style="margin-bottom:12px">
  <div class="words-label">Invoice Amount In Words</div>
  <strong>${amountInWords(inv.grandTotal || 0)}</strong>
</div>

<!-- Remarks + Declaration side by side -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
  ${inv.remarks ? `
  <div>
    <div class="section-label" style="margin-bottom:6px">Remarks</div>
    <div class="decl-box">${inv.remarks}</div>
  </div>` : "<div></div>"}
  <div>
    <div class="section-label" style="margin-bottom:6px">Declaration</div>
    <div class="decl-box" style="white-space:pre-line">${inv.declaration || "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct to the best of our knowledge and belief.\nGoods Once Sold Will Not be Taken back. All disputes are subject to Lucknow's Jurisdiction."}</div>
  </div>
</div>

<!-- Footer: Signature only -->
<div class="footer-row" style="border-top:1px solid ${lineGray};padding-top:12px;margin-top:8px">
  <div style="font-size:10px;color:${label}">This is a computer-generated invoice.</div>
</div>

</body>
</html>`;

    const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfDir = path.join(process.cwd(), "public", "invoices");
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const filename = `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`;
    const pdfPath  = path.join(pdfDir, filename);

    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    await browser.close();

    invoice.pdfUrl = `/invoices/${filename}`;
    await invoice.save();

    return res.status(200).json({ message: "PDF generated", pdfUrl: invoice.pdfUrl });

  } catch (error) {
    console.error("PDF GENERATION ERROR:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
}
