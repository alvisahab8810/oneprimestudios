// Every file attached to one order, for the buyer's file history screen.
// The size of each file is read off the disk so the screen can total it up.
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { buildFileHistory } from "@/lib/orderHistory";
import mongoose from "mongoose";
import path from "path";
import fs from "fs";

// Looks up a public upload on disk. Anything outside /public is ignored, so a
// stored path can never be used to read elsewhere on the server.
function sizeOf(url) {
  if (!url || !url.startsWith("/")) return 0;
  const root = path.join(process.cwd(), "public");
  const bare = url.split("?")[0];

  // A file saved with spaces or brackets in its name is stored with those
  // characters escaped in the URL, so the escaped and the plain spelling are
  // both tried before giving up
  const candidates = [bare];
  try {
    const decoded = decodeURIComponent(bare);
    if (decoded !== bare) candidates.push(decoded);
  } catch {
    // a stray % in the name — the plain spelling is all there is
  }

  for (const candidate of candidates) {
    const full = path.join(root, candidate);
    if (!full.startsWith(root)) continue;
    try {
      return fs.statSync(full).size;
    } catch {
      // try the next spelling
    }
  }

  return 0;
}

export default async function handler(req, res) {
  await dbConnect();
  res.setHeader("Cache-Control", "private, no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid order id" });
  }

  try {
    const order = await Order.findById(id)
      .select("user orderNumber createdAt items reuploadedFiles deliveryChallan")
      .populate("items.product", "name")
      .lean();

    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.user) !== String(user._id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const files = buildFileHistory(order).map((file) => ({
      ...file,
      ext: (file.name.split(".").pop() || "").toUpperCase(),
      size: sizeOf(file.url),
    }));

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    const staff = [...new Set(files.map((f) => f.uploadedBy).filter(Boolean))];

    // A file that was uploaded on another machine is not on this disk, so its
    // size cannot be read. When none of them can be, the screen drops the size
    // column rather than showing a column of dashes.
    const sizeKnown = files.some((file) => file.size > 0);

    return res.json({
      orderNumber: order.orderNumber || "",
      files,
      totals: {
        uploads: files.length,
        sizeMB: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
        staff: staff.length,
        sizeKnown,
      },
    });
  } catch (err) {
    console.error("Order file history error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
