



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
    if (!invoiceId) {
      return res.status(400).json({ message: "invoiceId required" });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // 🟢 1. Launch Puppeteer
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // 🟢 2. Build HTML directly (NO URL)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { margin-bottom: 5px; }
    hr { margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ccc; padding: 8px; }
    th { background: #f5f5f5; }
    .right { text-align: right; }
  </style>
</head>
<body>

  <h1>One Prime Studios</h1>
  <p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
  <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString()}</p>

  <hr />

<p>
  <strong>Billed To:</strong><br />

  <strong>${invoice.partnerName}</strong><br />

  ${
    invoice.partnerAddress?.companyName
      ? `${invoice.partnerAddress.companyName}<br />`
      : ""
  }

  ${
    invoice.partnerAddress?.street
      ? `${invoice.partnerAddress.street}<br />`
      : ""
  }

  ${
    [
      invoice.partnerAddress?.city,
      invoice.partnerAddress?.state,
      invoice.partnerAddress?.zip,
    ]
      .filter(Boolean)
      .join(", ")
  }
  <br />

  ${
    invoice.partnerAddress?.gst
      ? `<strong>GST No:</strong> ${invoice.partnerAddress.gst}<br />`
      : ""
  }

  ${
    invoice.partnerAddress?.phone
      ? `📞 ${invoice.partnerAddress.phone}<br />`
      : ""
  }

  ${
    invoice.partnerAddress?.email
      ? `📧 ${invoice.partnerAddress.email}`
      : ""
  }
</p>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td>${item.qty}</td>
          <td>₹ ${item.rate}</td>
          <td>₹ ${item.amount}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <h3 class="right">
    Total: ₹ ${invoice.grandTotal}
  </h3>

</body>
</html>
`;

    // 🟢 3. Set HTML content
    await page.setContent(html, { waitUntil: "networkidle0" });

    // 🟢 4. Ensure directory exists
    const pdfDir = path.join(process.cwd(), "public", "invoices");
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const pdfPath = path.join(
      pdfDir,
      `${invoice.invoiceNumber}.pdf`
    );

    // 🟢 5. Generate PDF
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    // 🟢 6. Save PDF URL
  invoice.pdfUrl = `/invoices/${invoice.invoiceNumber}.pdf`;
invoice.status = "SENT";          // ✅ ADD THIS LINE
await invoice.save();

    return res.status(200).json({
      message: "PDF generated successfully",
      pdfUrl: invoice.pdfUrl,
    });

  } catch (error) {
    console.error("PDF GENERATION ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
