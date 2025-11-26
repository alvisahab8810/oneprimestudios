

import { sendEmail } from "@/lib/sendEmail";
import { orderStatusTemplate } from "@/lib/emailTemplates";
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import User from "@/models/User";     // ✅ for user populate
import Product from "@/models/Product"; // ✅ add this line
import { verifyAdmin } from "@/lib/verifyJWT";
import mongoose from "mongoose";

export default async function handler(req, res) {
  await dbConnect();

  const admin = await verifyAdmin(req, res);
  if (!admin) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.query;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid Order ID" });
  }

if (req.method === "GET") {
  try {
    const order = await Order.findById(id)
      .populate("user", "name email phone userType companyName")
      .populate("items.product", "name mainImage price")
      .lean(); // ✅ convert to plain JS object (important)

    if (!order) return res.status(404).json({ message: "Order not found" });

    // ✅ Ensure uploadedFiles array always exists
    order.uploadedFiles = order.uploadedFiles || [];

    return res.status(200).json({ order });
  } catch (err) {
    console.error("❌ Error fetching order:", err);
    return res.status(500).json({ message: "Failed to fetch order" });
  }
}

//  if (req.method === "PUT") {
//   try {
//     const { status, remarks } = req.body; // ✅ get remarks from frontend

//     if (!status)
//       return res.status(400).json({ message: "Status is required" });

//     const order = await Order.findById(id);
//     if (!order) return res.status(404).json({ message: "Order not found" });


//     // ✅ update status
//     order.status = status;

//     // ✅ save remarks only when rejected
//     if (status === "Design Rejected" && remarks) {
//       order.remarks = remarks;
//     } else if (status !== "Design Rejected") {
//       order.remarks = ""; // clear old remarks
//     }

//     await order.save();

//     return res.status(200).json({
//       success: true,
//       message: "Order status updated successfully",
//       order,
//     });
//   } catch (err) {
//     console.error("❌ Error updating order:", err);
//     return res.status(500).json({ message: "Failed to update order" });
//   }
// }



if (req.method === "PUT") {
  try {
    const { status, remarks } = req.body;

    if (!status) return res.status(400).json({ message: "Status is required" });

    const order = await Order.findById(id).populate("user", "name email").populate("items.product", "name");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // update status & remarks logic (your existing)
    order.status = status;
    if (status === "Design Rejected" && remarks) {
      order.remarks = remarks;
    } else if (status !== "Design Rejected") {
      order.remarks = "";
    }



    // --- NEW LOGIC FOR DISPATCH REQUEST FLOW ---

      // If admin selects "Order Ready", customer can now send dispatch request
      if (status === "Order Ready") {
        order.dispatchRequest = "none"; // reset previous values
      }

      // If admin marks order as dispatched, auto-approve request
      if (status === "Order Dispatched") {
        order.dispatchRequest = "approved";
      }

   // --- NEW LOGIC FOR DISPATCH REQUEST FLOW ---
    await order.save();

    // Prepare email content
    const emailHtml = orderStatusTemplate({
      name: order.user?.name || order.shipping?.name || "Customer",
      orderNumber: order.orderNumber || order._id,
      status: order.status,
      remarks: order.remarks,
      items: order.items.map(i => ({
        product: i.product && i.product.name ? i.product : i.product, // template supports both
        quantity: i.quantity,
        price: i.price,
      })),
      total: order.total,
    });

    // Send email but DON'T fail the whole request if email sending fails.
    (async () => {
      try {
        // Optionally CC admin: process.env.ADMIN_EMAIL or "info@viralon.in"
        await sendEmail({
          to: order.user.email,
          cc: process.env.ADMIN_EMAIL || "info@viralon.in",
          subject: `Update: Your Order ${order.orderNumber} — ${order.status}`,
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error("❌ Failed to send status email:", emailErr);
      }
    })();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (err) {
    console.error("❌ Error updating order:", err);
    return res.status(500).json({ message: "Failed to update order" });
  }
}


  return res.status(405).json({ message: "Method not allowed" });
}
