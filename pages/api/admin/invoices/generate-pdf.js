// pages/api/admin/invoices/generate-pdf.js
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await dbConnect();

    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ message: "invoiceId required" });

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // ── No status block — allow PDF generation for any status ───────────────
    // (previously blocked when status === "SENT" which broke the send flow)

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    h1 { margin: 0 0 4px; font-size: 28px; }
    hr { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #111; color: #fff; padding: 10px 12px; text-align: left; font-size: 12px; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    .totals-table td { border: none; padding: 6px 12px; }
    .grand-total td { font-weight: 700; font-size: 16px; border-top: 2px solid #111; }
    .text-right { text-align: right; }
    .muted { color: #6b7280; font-size: 12px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <h1>One Prime Studios</h1>
      ${invoice.sellerAddress ? `<p class="muted">${invoice.sellerAddress}</p>` : ""}
      ${invoice.sellerGst ? `<p class="muted">GSTIN: ${invoice.sellerGst}</p>` : ""}
    </div>
    <div style="text-align:right">
      <h2 style="margin:0 0 8px;letter-spacing:2px;color:#111">INVOICE</h2>
      <p class="muted">Invoice No: <strong style="color:#111">${invoice.invoiceNumber}</strong></p>
      <p class="muted">Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" })}</p>
      <p class="muted">Order: #${invoice.orderNumber}</p>
    </div>
  </div>

  <hr/>

  <div style="display:flex;justify-content:space-between;margin-bottom:24px">
    <div>
      <p class="muted" style="margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Bill To</p>
      <strong style="font-size:15px">${invoice.partnerName}</strong><br/>
      ${invoice.partnerAddress?.companyName ? `<span class="muted">${invoice.partnerAddress.companyName}</span><br/>` : ""}
      ${invoice.partnerAddress?.street ? `<span class="muted">${invoice.partnerAddress.street}</span><br/>` : ""}
      ${[invoice.partnerAddress?.city, invoice.partnerAddress?.state, invoice.partnerAddress?.zip].filter(Boolean).join(", ")}
      ${invoice.partnerAddress?.gst ? `<br/><span class="muted">GSTIN: <strong>${invoice.partnerAddress.gst}</strong></span>` : ""}
      ${invoice.partnerAddress?.phone ? `<br/><span class="muted">📞 ${invoice.partnerAddress.phone}</span>` : ""}
      ${invoice.partnerAddress?.email ? `<br/><span class="muted">✉ ${invoice.partnerAddress.email}</span>` : ""}
    </div>
    <div style="text-align:right">
      <p class="muted" style="margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Payment</p>
      <span class="muted">Method: ${invoice.paymentSnapshot?.paymentMethod || "—"}</span><br/>
      <span class="muted">Status: ${invoice.paymentSnapshot?.paymentStatus || "—"}</span><br/>
      ${invoice.paymentSnapshot?.transactionId ? `<span class="muted">Txn: ${invoice.paymentSnapshot.transactionId}</span>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>HSN/SAC</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Taxable Amt</th>
        ${invoice.gstType === "INTRA"
          ? `<th class="text-right">CGST ${invoice.cgstPercent || 0}%</th><th class="text-right">SGST ${invoice.sgstPercent || 0}%</th>`
          : invoice.gstType === "INTER"
            ? `<th class="text-right">IGST ${invoice.igstPercent || 0}%</th>`
            : ""}
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item, i) => {
        const taxable = item.taxableAmount || (item.qty * item.rate);
        const cgst = invoice.gstType === "INTRA" ? (taxable * (invoice.cgstPercent || 0)) / 100 : 0;
        const sgst = invoice.gstType === "INTRA" ? (taxable * (invoice.sgstPercent || 0)) / 100 : 0;
        const igst = invoice.gstType === "INTER" ? (taxable * (invoice.igstPercent || 0)) / 100 : 0;
        const total = taxable + cgst + sgst + igst;
        return `
          <tr>
            <td>${i + 1}</td>
            <td>${item.description}</td>
            <td class="muted">${item.hsnCode || "—"}</td>
            <td class="text-right">${item.qty}</td>
            <td class="text-right">₹${Number(item.rate).toFixed(2)}</td>
            <td class="text-right">₹${taxable.toFixed(2)}</td>
            ${invoice.gstType === "INTRA"
              ? `<td class="text-right">₹${cgst.toFixed(2)}</td><td class="text-right">₹${sgst.toFixed(2)}</td>`
              : invoice.gstType === "INTER"
                ? `<td class="text-right">₹${igst.toFixed(2)}</td>`
                : ""}
            <td class="text-right"><strong>₹${total.toFixed(2)}</strong></td>
          </tr>
        `;
      }).join("")}
    </tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-top:20px">
    <table class="totals-table" style="width:300px">
      <tr>
        <td>Taxable Value</td>
        <td class="text-right">₹${Number(invoice.taxableValue || invoice.subTotal || 0).toFixed(2)}</td>
      </tr>
      ${invoice.gstType === "INTRA" ? `
        <tr><td>CGST @ ${invoice.cgstPercent || 0}%</td><td class="text-right">₹${Number(invoice.cgstAmount || 0).toFixed(2)}</td></tr>
        <tr><td>SGST @ ${invoice.sgstPercent || 0}%</td><td class="text-right">₹${Number(invoice.sgstAmount || 0).toFixed(2)}</td></tr>
      ` : invoice.gstType === "INTER" ? `
        <tr><td>IGST @ ${invoice.igstPercent || 0}%</td><td class="text-right">₹${Number(invoice.igstAmount || 0).toFixed(2)}</td></tr>
      ` : ""}
      <tr><td>Total Tax</td><td class="text-right">₹${Number(invoice.gstAmount || 0).toFixed(2)}</td></tr>
      <tr class="grand-total">
        <td>Grand Total</td>
        <td class="text-right">₹${Number(invoice.grandTotal || 0).toFixed(2)}</td>
      </tr>
    </table>
  </div>

  ${invoice.remarks ? `<hr/><p class="muted"><strong>Remarks:</strong> ${invoice.remarks}</p>` : ""}

  <hr/>
  <p class="muted" style="text-align:center">This is a computer-generated invoice.</p>

</body>
</html>`;

    await page.setContent(html, { waitUntil: "networkidle0" });

    // ── Save PDF to flat path: /public/invoices/INVOICENUMBER.pdf ────────────
    // Using flat structure to avoid path confusion in send-email
    const pdfDir = path.join(process.cwd(), "public", "invoices");
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const filename = `${invoice.invoiceNumber}.pdf`;
    const pdfPath  = path.join(pdfDir, filename);

    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    await browser.close();

    // ── Save flat pdfUrl to DB ────────────────────────────────────────────────
    invoice.pdfUrl = `/invoices/${filename}`;
    await invoice.save();

    console.log("✅ PDF generated:", pdfPath);

    return res.status(200).json({
      message: "PDF generated",
      pdfUrl:  invoice.pdfUrl,
    });

  } catch (error) {
    console.error("PDF GENERATION ERROR:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
}





// import dbConnect from "@/lib/dbConnect";
// import Invoice from "@/models/Invoice";
// import puppeteer from "puppeteer";
// import fs from "fs";
// import path from "path";

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   try {
//     await dbConnect();

//     const { invoiceId } = req.body;
//     if (!invoiceId) {
//       return res.status(400).json({ message: "invoiceId required" });
//     }

//     const invoice = await Invoice.findById(invoiceId);
//     if (!invoice) {
//       return res.status(404).json({ message: "Invoice not found" });
//     }

//     // 🟢 1. Launch Puppeteer
//     const browser = await puppeteer.launch({
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });

//     const page = await browser.newPage();

//     // 🟢 2. Build HTML directly (NO URL)
//     const html = `
// <!DOCTYPE html>
// <html>
// <head>
//   <meta charset="UTF-8" />
//   <style>
//     body { font-family: Arial, sans-serif; padding: 40px; }
//     h1 { margin-bottom: 5px; }
//     hr { margin: 20px 0; }
//     table { width: 100%; border-collapse: collapse; margin-top: 20px; }
//     th, td { border: 1px solid #ccc; padding: 8px; }
//     th { background: #f5f5f5; }
//     .right { text-align: right; }
//   </style>
// </head>
// <body>

//   <h1>One Prime Studios</h1>
//   <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
//   <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>

//   <hr />

// <p>
//   <strong>Billed To:</strong><br />

//   <strong>${invoice.partnerName}</strong><br />

//   ${
//     invoice.partnerAddress?.companyName
//       ? `${invoice.partnerAddress.companyName}<br />`
//       : ""
//   }

//   ${
//     invoice.partnerAddress?.street
//       ? `${invoice.partnerAddress.street}<br />`
//       : ""
//   }

//   ${
//     [
//       invoice.partnerAddress?.city,
//       invoice.partnerAddress?.state,
//       invoice.partnerAddress?.zip,
//     ]
//       .filter(Boolean)
//       .join(", ")
//   }
//   <br />

//   ${
//     invoice.partnerAddress?.gst
//       ? `<strong>GST No:</strong> ${invoice.partnerAddress.gst}<br />`
//       : ""
//   }

//   ${
//     invoice.partnerAddress?.phone
//       ? `📞 ${invoice.partnerAddress.phone}<br />`
//       : ""
//   }

//   ${
//     invoice.partnerAddress?.email
//       ? `📧 ${invoice.partnerAddress.email}`
//       : ""
//   }
// </p>

//   <table>
//     <thead>
//       <tr>
//         <th>Description</th>
//         <th>Qty</th>
//         <th>Rate</th>
//         <th>Amount</th>
//       </tr>
//     </thead>
//     <tbody>
//       ${invoice.items.map(item => `
//         <tr>
//           <td>${item.description}</td>
//           <td>${item.qty}</td>
//           <td>₹ ${item.rate}</td>
//           <td>₹ ${item.amount}</td>
//         </tr>
//       `).join("")}
//     </tbody>
//   </table>

//   <h3 class="right">
//     Total: ₹ ${invoice.grandTotal}
//   </h3>

// </body>
// </html>
// `;

//     // 🟢 3. Set HTML content
//     await page.setContent(html, { waitUntil: "networkidle0" });

//     // 🟢 4. Ensure directory exists
//     const pdfDir = path.join(process.cwd(), "public", "invoices");
//     if (!fs.existsSync(pdfDir)) {
//       fs.mkdirSync(pdfDir, { recursive: true });
//     }

//     const pdfPath = path.join(
//       pdfDir,
//       `${invoice.invoiceNumber}.pdf`
//     );

//     // 🟢 5. Generate PDF
//     await page.pdf({
//       path: pdfPath,
//       format: "A4",
//       printBackground: true,
//     });

//     await browser.close();

//     // 🟢 6. Save PDF URL
//     invoice.pdfUrl = `/invoices/${invoice.invoiceNumber}.pdf`;
//     await invoice.save();

//     return res.status(200).json({
//       message: "PDF generated successfully",
//       pdfUrl: invoice.pdfUrl,
//     });

//   } catch (error) {
//     console.error("PDF GENERATION ERROR:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// }





// import dbConnect from "@/lib/dbConnect";
// import Invoice from "@/models/Invoice";
// import puppeteer from "puppeteer";
// import fs from "fs";
// import path from "path";

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   try {
//     await dbConnect();

//     const { invoiceId } = req.body;
//     if (!invoiceId) {
//       return res.status(400).json({ message: "invoiceId required" });
//     }

//     const invoice = await Invoice.findById(invoiceId);
//     if (!invoice) {
//       return res.status(404).json({ message: "Invoice not found" });
//     }

//     // 🟢 1. Launch Puppeteer
//     const browser = await puppeteer.launch({
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });

//     const page = await browser.newPage();

//     // 🟢 2. Build HTML directly (NO URL)
//     const html = `
// <!DOCTYPE html>
// <html>
// <head>
//   <meta charset="UTF-8" />
//   <style>
//     body { font-family: Arial, sans-serif; padding: 40px; }
//     h1 { margin-bottom: 5px; }
//     hr { margin: 20px 0; }
//     table { width: 100%; border-collapse: collapse; margin-top: 20px; }
//     th, td { border: 1px solid #ccc; padding: 8px; }
//     th { background: #f5f5f5; }
//     .right { text-align: right; }
//   </style>
// </head>
// <body>

//   <h1>One Prime Studios</h1>
//   <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
//   <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>

//   <hr />

// <p>
//   <strong>Billed To:</strong><br />

//   <strong>${invoice.partnerName}</strong><br />

//   ${
//     invoice.partnerAddress?.companyName
//       ? `${invoice.partnerAddress.companyName}<br />`
//       : ""
//   }

//   ${
//     invoice.partnerAddress?.street
//       ? `${invoice.partnerAddress.street}<br />`
//       : ""
//   }

//   ${
//     [
//       invoice.partnerAddress?.city,
//       invoice.partnerAddress?.state,
//       invoice.partnerAddress?.zip,
//     ]
//       .filter(Boolean)
//       .join(", ")
//   }
//   <br />

//   ${
//     invoice.partnerAddress?.gst
//       ? `<strong>GST No:</strong> ${invoice.partnerAddress.gst}<br />`
//       : ""
//   }

//   ${
//     invoice.partnerAddress?.phone
//       ? `📞 ${invoice.partnerAddress.phone}<br />`
//       : ""
//   }

//   ${
//     invoice.partnerAddress?.email
//       ? `📧 ${invoice.partnerAddress.email}`
//       : ""
//   }
// </p>

//   <table>
//     <thead>
//       <tr>
//         <th>Description</th>
//         <th>Qty</th>
//         <th>Rate</th>
//         <th>Amount</th>
//       </tr>
//     </thead>
//     <tbody>
//       ${invoice.items.map(item => `
//         <tr>
//           <td>${item.description}</td>
//           <td>${item.qty}</td>
//           <td>₹ ${item.rate}</td>
//           <td>₹ ${item.amount}</td>
//         </tr>
//       `).join("")}
//     </tbody>
//   </table>

//   <h3 class="right">
//     Total: ₹ ${invoice.grandTotal}
//   </h3>

// </body>
// </html>
// `;

//     // 🟢 3. Set HTML content
//     await page.setContent(html, { waitUntil: "networkidle0" });

//     // 🟢 4. Ensure directory exists
//     const pdfDir = path.join(process.cwd(), "public", "invoices");
//     if (!fs.existsSync(pdfDir)) {
//       fs.mkdirSync(pdfDir, { recursive: true });
//     }

//     const pdfPath = path.join(
//       pdfDir,
//       `${invoice.invoiceNumber}.pdf`
//     );

//     // 🟢 5. Generate PDF
//     await page.pdf({
//       path: pdfPath,
//       format: "A4",
//       printBackground: true,
//     });

//     await browser.close();

//     // 🟢 6. Save PDF URL
//   invoice.pdfUrl = `/invoices/${invoice.invoiceNumber}.pdf`;
// invoice.status = "SENT";          // ✅ ADD THIS LINE
// await invoice.save();

//     return res.status(200).json({
//       message: "PDF generated successfully",
//       pdfUrl: invoice.pdfUrl,
//     });

//   } catch (error) {
//     console.error("PDF GENERATION ERROR:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// }
