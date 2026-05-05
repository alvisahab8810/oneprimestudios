// pages/api/admin/invoices/generate-pdf.js
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

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

    // ── Item rows ─────────────────────────────────────────────────────────────
    const itemRows = inv.items.map((item, i) => {
      const taxable = Number(item.taxableAmount || (item.qty * item.rate) || 0);
      const cgst = inv.gstType === "INTRA" ? (taxable * (inv.cgstPercent || 0)) / 100 : 0;
      const sgst = inv.gstType === "INTRA" ? (taxable * (inv.sgstPercent || 0)) / 100 : 0;
      const igst = inv.gstType === "INTER" ? (taxable * (inv.igstPercent || 0)) / 100 : 0;
      const total = taxable + cgst + sgst + igst;

      return `
        <tr>
          <td>${i + 1}</td>
          <td>${item.description || "—"}</td>
          <td>${item.hsnCode || "—"}</td>
          <td class="r">${item.qty}</td>
          <td class="r">₹${fmt(item.rate)}</td>
          <td class="r">₹${fmt(taxable)}</td>
          ${inv.gstType === "INTRA"
            ? `<td class="r">₹${fmt(cgst)}</td><td class="r">₹${fmt(sgst)}</td>`
            : inv.gstType === "INTER"
              ? `<td class="r" colspan="2">₹${fmt(igst)}</td>`
              : `<td class="r" colspan="2">—</td>`}
          <td class="r"><strong>₹${fmt(total)}</strong></td>
        </tr>`;
    }).join("");

    // ── Tax summary rows ──────────────────────────────────────────────────────
    const taxSummaryRows = inv.gstType === "INTRA"
      ? `<tr><td>SGST</td><td class="r">₹${fmt(inv.taxableValue || inv.subTotal)}</td><td class="r">${inv.sgstPercent || 0}%</td><td class="r">₹${fmt(inv.sgstAmount)}</td></tr>
         <tr><td>CGST</td><td class="r">₹${fmt(inv.taxableValue || inv.subTotal)}</td><td class="r">${inv.cgstPercent || 0}%</td><td class="r">₹${fmt(inv.cgstAmount)}</td></tr>`
      : inv.gstType === "INTER"
        ? `<tr><td>IGST</td><td class="r">₹${fmt(inv.taxableValue || inv.subTotal)}</td><td class="r">${inv.igstPercent || 0}%</td><td class="r">₹${fmt(inv.igstAmount)}</td></tr>`
        : `<tr><td colspan="4" class="r">No GST applicable</td></tr>`;

    const gstColHeader = inv.gstType === "INTRA"
      ? `<th class="r">CGST<br/>${inv.cgstPercent||0}%</th><th class="r">SGST<br/>${inv.sgstPercent||0}%</th>`
      : `<th class="r" colspan="2">IGST<br/>${inv.igstPercent||0}%</th>`;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11.5px; color: #111; padding: 28px 32px; background: #fff; }
  .original { text-align: right; font-size: 9px; color: #999; margin-bottom: 6px; letter-spacing: 0.05em; text-transform: uppercase; }
  .header   { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
  .company-name { font-size: 20px; font-weight: 900; color: #111; letter-spacing: -0.5px; margin-bottom: 4px; }
  .company-info { font-size: 10.5px; color: #555; line-height: 1.7; max-width: 280px; }
  .invoice-badge { display: inline-block; background: #111; color: #fff; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; padding: 4px 14px; border-radius: 4px; margin-bottom: 10px; }
  .invoice-num { font-size: 18px; font-weight: 900; color: #111; margin-bottom: 4px; }
  .invoice-meta { font-size: 11px; color: #666; margin-bottom: 2px; }
  .invoice-meta strong { color: #111; }
  .divider { border: none; border-top: 1.5px solid #eee; margin: 14px 0; }
  .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
  .three-col > div { padding: 10px 13px; border-right: 1px solid #ddd; background: #fafafa; }
  .three-col > div:last-child { border-right: none; }
  .col-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 6px; }
  .col-name  { font-size: 12px; font-weight: 700; color: #111; margin-bottom: 3px; }
  .col-info  { font-size: 10.5px; color: #555; line-height: 1.7; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 10px; border-radius: 6px; overflow: hidden; }
  table.items thead tr { background: #1a1a1a; color: #fff; }
  table.items th { padding: 8px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  table.items td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; font-size: 11px; vertical-align: top; }
  table.items tbody tr:last-child td { border-bottom: 2px solid #111; font-weight: 700; background: #f9fafb; }
  .r { text-align: right; }
  .tax-box { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .tax-box > div { border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
  table.tax-summary { width: 100%; border-collapse: collapse; }
  table.tax-summary th { background: #1a1a1a; color: #fff; padding: 7px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  table.tax-summary td { padding: 5px 10px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
  .amounts-header { background: #1a1a1a; color: #fff; padding: 7px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  table.amounts { width: 100%; border-collapse: collapse; }
  table.amounts td { padding: 5px 10px; font-size: 11.5px; border-bottom: 1px solid #f0f0f0; }
  .grand-row td { font-weight: 800; font-size: 13px; border-top: 2px solid #111; padding-top: 8px; }
  .words-box { border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; font-size: 11px; }
  .words-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 4px; }
  .section-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #fff; background: #1a1a1a; padding: 5px 10px; border-radius: 4px 4px 0 0; }
  .decl-box { border: 1px solid #ddd; border-top: none; border-radius: 0 0 4px 4px; padding: 8px 10px; font-size: 10.5px; color: #555; line-height: 1.7; }
  .footer-row { display: flex; justify-content: space-between; align-items: flex-end; }
  .sign-box { text-align: right; font-size: 11px; }
  .sign-line { border-top: 1.5px solid #111; margin-top: 36px; padding-top: 5px; min-width: 180px; display: inline-block; font-weight: 700; font-size: 11px; }
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
      ${inv.gstType === "INTRA"
        ? `<strong>CGST:</strong> ${inv.cgstPercent||0}% &nbsp; <strong>SGST:</strong> ${inv.sgstPercent||0}%`
        : inv.gstType === "INTER"
          ? `<strong>IGST:</strong> ${inv.igstPercent||0}%`
          : "No GST applicable"}
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
      ${gstColHeader}
      <th class="r">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
    <tr style="font-weight:700;background:#f9fafb">
      <td colspan="3"><strong>Total</strong></td>
      <td class="r">${inv.items.reduce((s,i)=>s+Number(i.qty||0),0)}</td>
      <td></td>
      <td class="r"><strong>₹${fmt(inv.taxableValue || inv.subTotal)}</strong></td>
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
      ${inv.gstType === "INTRA"
        ? `<tr><td>CGST @ ${inv.cgstPercent||0}%</td><td class="r">₹${fmt(inv.cgstAmount)}</td></tr>
           <tr><td>SGST @ ${inv.sgstPercent||0}%</td><td class="r">₹${fmt(inv.sgstAmount)}</td></tr>`
        : inv.gstType === "INTER"
          ? `<tr><td>IGST @ ${inv.igstPercent||0}%</td><td class="r">₹${fmt(inv.igstAmount)}</td></tr>`
          : ""}
      <tr><td>Total Tax</td><td class="r">₹${fmt(inv.gstAmount)}</td></tr>
      ${(() => {
        const saved    = Number(inv.couponDiscount || 0);
        const inferred = Math.round(((inv.subTotal || 0) + (inv.gstAmount || 0) - (inv.grandTotal || 0)) * 100) / 100;
        const discount = saved > 0 ? saved : (inferred > 0.001 ? inferred : 0);
        if (!discount) return "";
        return `<tr><td style="color:#16a34a;font-weight:600">Coupon Discount${inv.couponCode ? ` (${inv.couponCode})` : ""}</td><td class="r" style="color:#16a34a;font-weight:600">− ₹${fmt(discount)}</td></tr>`;
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
<div class="footer-row" style="border-top:1px solid #ddd;padding-top:12px;margin-top:8px">
  <div style="font-size:10px;color:#888">This is a computer-generated invoice.</div>
  <div class="sign-box">
    For: ${OPS.name}<br/>
    <br/><br/><br/>
    <div class="sign-line">Authorized Signatory</div>
  </div>
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
