// import dbConnect from "@/lib/dbConnect";
// import Invoice from "@/models/Invoice";
// import getUserFromToken from "@/lib/getUserFromToken";

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   try {
//     await dbConnect();

//     // 🔐 Auth via token
//     const user = await getUserFromToken(req);
//     if (!user || user.userType !== "partner") {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const { walletTxnId } = req.query;
//     if (!walletTxnId) {
//       return res.status(400).json({ message: "walletTxnId required" });
//     }
// const invoice = await Invoice.findOne({
//   walletTxnId,
//   partnerId: user._id,
//   status: { $in: ["SENT", "DRAFT"] },
// }).select("pdfUrl invoiceNumber");


//     if (!invoice || !invoice.pdfUrl) {
//       return res.status(200).json({ invoice: null });
//     }

//     return res.status(200).json({
//       invoice: {
//         invoiceNumber: invoice.invoiceNumber,
//         pdfUrl: invoice.pdfUrl,
//       },
//     });
//   } catch (error) {
//     console.error("INVOICE LOOKUP ERROR:", error);
//     return res.status(500).json({ message: "Server error" });
//   }
// }
