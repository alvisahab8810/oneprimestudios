// lib/ewayBillPdf.js — server only (puppeteer). Renders the e-way bill PDF laid out like the
// NIC portal print: QR code, 1. E-Way Bill details, 2. Address, 3. Goods, 4. Transportation,
// 5. Vehicle, barcode. Used by the generate-pdf and send-email APIs.
import puppeteer from "puppeteer";
import bwipjs from "bwip-js";
import fs from "fs";
import path from "path";
import {
  SELLER, withInvoiceDefaults, taxRateLabel, ewbDate, ewbDateTime, ewbNumberFmt,
} from "@/lib/ewayBill";

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ESC_MAP[c]);
const num = (n) => Number(n || 0).toFixed(2);
const up = (v) => esc(String(v || "").toUpperCase());
const dash = (v) => (v ? esc(v) : "-");

// "Kanpur Nagar,UTTAR PRADESH-208025"
const placeLine = (a = {}) =>
  [esc(a.city), up(a.state)].filter(Boolean).join(",") + (a.pincode ? `-${esc(a.pincode)}` : "");

function buildHtml(b, inv) {
  const isGenerated = b.status === "GENERATED" && /^\d{12}$/.test(b.ewbNumber || "");
  const watermark = b.status === "CANCELLED" ? "CANCELLED" : !isGenerated ? "DRAFT" : "";

  // QR (EWB No / generator GSTIN / generated date-time) and Code 128 barcode of the EWB No.
  const qrSvg = isGenerated
    ? bwipjs.toSVG({ bcid: "qrcode", text: `${b.ewbNumber}/${SELLER.gstin}/${ewbDateTime(b.generatedAt, true)}`, scale: 3 })
    : "";
  const barcodeSvg = isGenerated
    ? bwipjs.toSVG({ bcid: "code128", text: b.ewbNumber, height: 9, includetext: true, textxalign: "center", textsize: 9 })
    : "";

  // Totals — "Other Amt" reconciles the invoice total (discounts / round-off)
  const totTaxable = b.goods.reduce((s, g) => s + Number(g.taxableAmount || 0), 0);
  const cgst = Number(inv.cgstAmount || 0);
  const sgst = Number(inv.sgstAmount || 0);
  const igst = Number(inv.igstAmount || 0);
  const totalInv = Number(inv.grandTotal || 0);
  const other = Math.round((totalInv - totTaxable - cgst - sgst - igst) * 100) / 100;

  const goodsRows = b.goods
    .map(
      (g) => `<tr>
        <td>${esc(g.hsnCode || "-")}</td>
        <td>${esc(g.description)}</td>
        <td>${num(g.qty)}<br/>${esc(g.unit || "NOS")}</td>
        <td class="r">${num(g.taxableAmount)}</td>
        <td class="r">${taxRateLabel(inv.gstType, g.gstPercent)}</td>
      </tr>`
    )
    .join("");

  const supplyLabel = `${b.supplyType === "INWARD" ? "Inward" : "Outward"} - ${esc(b.subSupplyType)}`;
  const docDetails = `${esc(b.documentType)} - ${esc(inv.invoiceNumber)} - ${ewbDate(inv.invoiceDate || inv.createdAt)}`;
  const transporter = [b.transporterId, b.transporterName].filter(Boolean).map(esc).join(" &amp; ");
  const transDoc = b.transportDocNo || b.transportDocDate
    ? `${esc(b.transportDocNo)} &amp; ${b.transportDocDate ? ewbDate(b.transportDocDate) : ""}`
    : "";
  const vehicleCell = [
    b.transportMode === "Road" ? esc(b.vehicleNumber) : "",
    b.transportDocNo ? `${esc(b.transportDocNo)} &amp; ${b.transportDocDate ? ewbDate(b.transportDocDate) : ""}` : "",
  ].filter(Boolean).join("<br/>") || "-";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Roboto,Arial,Helvetica,sans-serif;font-size:11px;color:#222;padding:18px 22px}
  .wm{position:fixed;top:42%;left:0;right:0;text-align:center;font-size:100px;font-weight:900;color:rgba(0,0,0,.07);transform:rotate(-28deg);z-index:0}
  .sheet{border:1px solid #d5d5d5;padding:0 8px 8px}
  .top{display:flex;justify-content:space-between;align-items:center;padding:10px 0 6px}
  .top h1{font-size:21px;font-weight:700;color:#111}
  .qr{width:118px;height:118px}.qr svg{width:100%;height:100%}
  .sec{font-weight:700;font-size:11.5px;padding:7px 4px;border-top:1px solid #d5d5d5;border-bottom:1px solid #d5d5d5;margin-top:6px;color:#111}
  .rows .row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:8px 4px;border-bottom:1px solid #e5e5e5}
  b{font-weight:700;color:#111}
  .addr{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:8px 4px}
  .addr .h{font-weight:700;padding:4px 0 5px;color:#111}
  .box{border:1px solid #bbb;padding:7px 9px;font-size:10px;line-height:1.55;min-height:150px}
  table{width:100%;border-collapse:collapse}
  .tbl{margin:10px 4px;width:calc(100% - 8px)}
  .tbl th,.tbl td{border:1px solid #bbb;padding:7px 6px;text-align:left;vertical-align:middle}
  .tbl th{font-weight:700;color:#111}
  .r{text-align:right !important}
  .tot td .v{border:1px solid #bbb;padding:5px 6px;margin-top:2px}
  .tot th,.tot td{border:none;padding:4px 4px}
  .tot{border:1px solid #bbb}
  .kv{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:8px 4px}
  .code{text-align:center;padding:12px 0 6px}.code svg{height:44px;width:auto}
  .note{border-top:1px solid #e5e5e5;padding:8px 4px 2px;font-size:9.5px}
</style></head><body>
${watermark ? `<div class="wm">${watermark}</div>` : ""}
<div class="sheet">
  <div class="top">
    <h1>e-Way Bill</h1>
    ${qrSvg ? `<div class="qr">${qrSvg}</div>` : ""}
  </div>

  <div class="sec">1. E-WAY BILL Details</div>
  <div class="rows">
    <div class="row">
      <div>eWay Bill No: <b>${isGenerated ? esc(ewbNumberFmt(b.ewbNumber)) : "Not generated"}</b></div>
      <div>Generated Date:<b>${ewbDateTime(b.generatedAt)}</b></div>
      <div>Generated By: <b>${esc(SELLER.gstin)}</b><br/>Valid Upto: <b>${ewbDate(b.validUpto)}</b></div>
    </div>
    <div class="row">
      <div>Mode: <b>${esc(b.transportMode)}</b></div>
      <div>Approx Distance: <b>${esc(b.distanceKm || 0)}km</b></div>
      <div></div>
    </div>
    <div class="row">
      <div>Type: <b>${supplyLabel}</b></div>
      <div>Document Details: <b>${docDetails}</b></div>
      <div>Transaction type: <b>${esc(b.transactionType)}</b></div>
    </div>
  </div>

  <div class="sec">2.Address Details</div>
  <div class="addr">
    <div>
      <div class="h">From</div>
      <div class="box">
        GSTIN : ${esc(SELLER.gstin)}<br/>${up(SELLER.name)}<br/>${up(SELLER.state)}<br/><br/>
        :: Dispatch From ::<br/>${up(b.dispatchFrom?.street)}<br/>${placeLine(b.dispatchFrom)}
      </div>
    </div>
    <div>
      <div class="h">To</div>
      <div class="box">
        GSTIN : ${esc(b.billTo?.gstin || "URP")}<br/>${up(b.billTo?.name)}<br/>${up(b.billTo?.state)}<br/><br/>
        :: Ship To ::<br/>${up(b.shipTo?.street)}<br/>${placeLine(b.shipTo)}
      </div>
    </div>
  </div>

  <div class="sec">3. Goods Details</div>
  <table class="tbl">
    <tr>
      <th style="width:11%">HSN<br/>Code</th><th>Product Name &amp; Desc.</th><th style="width:10%">Quantity</th>
      <th style="width:14%">Taxable Amount<br/>Rs.</th><th style="width:22%">Tax Rate (C+S+I+Cess+Cess<br/>Non.Advol)</th>
    </tr>
    ${goodsRows}
  </table>
  <table class="tbl tot">
    <tr><th>Tot. Tax'ble Amt</th><th>CGST Amt</th><th>SGST Amt</th><th>IGST Amt</th><th>CESS Amt</th><th>CESS Non.Advol Amt</th><th>Other Amt</th><th>Total Inv.Amt</th></tr>
    <tr>
      <td><div class="v">${num(totTaxable)}</div></td><td><div class="v">${num(cgst)}</div></td>
      <td><div class="v">${num(sgst)}</div></td><td><div class="v">${num(igst)}</div></td>
      <td><div class="v">0.00</div></td><td><div class="v">0.00</div></td>
      <td><div class="v">${num(other)}</div></td><td><div class="v">${num(totalInv)}</div></td>
    </tr>
  </table>

  <div class="sec">4. Transportation Details</div>
  <div class="kv">
    <div>Transporter ID &amp; Name : <b>${transporter}</b></div>
    <div>Transporter Doc. No &amp; Date : <b>${transDoc}</b></div>
  </div>

  <div class="sec">5. Vehicle Details</div>
  <table class="tbl">
    <tr><th>Mode</th><th>Vehicle / Trans<br/>Doc No &amp; Dt.</th><th>From</th><th>Entered Date</th><th>Entered By</th><th>CEWB No.<br/>(If any)</th><th>Multi Veh.Info<br/>(If any)</th></tr>
    <tr>
      <td>${esc(b.transportMode)}</td>
      <td>${vehicleCell}</td>
      <td>${dash(b.dispatchFrom?.city)}</td>
      <td>${ewbDateTime(b.generatedAt)}</td>
      <td>${esc(SELLER.gstin)}</td>
      <td>${dash(b.cewbNumber)}</td>
      <td>-</td>
    </tr>
  </table>

  ${barcodeSvg ? `<div class="code">${barcodeSvg}</div>` : ""}
  ${!isGenerated ? `<div class="note"><b>Note:</b> Draft copy — not valid for movement of goods until the E-Way Bill No. is generated on ewaybillgst.gov.in.</div>` : ""}
</div>
</body></html>`;
}

// Writes public/eway-bills/EWB-<invoice>.pdf and sets bill.pdfUrl (caller saves the bill).
export async function renderEwayBillPdf(bill, inv) {
  const b = withInvoiceDefaults(bill.toObject ? bill.toObject() : bill, inv);
  const html = buildHtml(b, inv);

  const dir = path.join(process.cwd(), "public", "eway-bills");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `EWB-${inv.invoiceNumber.replace(/[\/\\\s]/g, "-")}.pdf`;
  const filePath = path.join(dir, filename);

  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: filePath, format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }

  bill.pdfUrl = `/eway-bills/${filename}`;
  return { pdfUrl: bill.pdfUrl, filePath, filename };
}
