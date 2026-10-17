// Documents raised before the move store a plain path (/invoices/OPS-001.pdf)
// in the database. A rewrite in next.config.mjs sends those paths here instead
// of to the public folder, so an old link keeps working but is now checked.
import fs from "fs";
import path from "path";
import { requireAdminPermission } from "@/lib/adminAuth";
import { findStoredPdf } from "@/lib/documentStorage";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const admin = await requireAdminPermission(req, res, "invoices");
  if (!admin) return;

  res.setHeader("Cache-Control", "private, no-store");

  const parts = [].concat(req.query.parts || []).map(String);
  const folder = parts[0] === "eway-bills" ? "eway" : "invoice";
  const relative = parts.slice(1).join("/");

  if (!relative || !relative.toLowerCase().endsWith(".pdf")) {
    return res.status(400).json({ message: "Unknown document" });
  }

  const filePath = findStoredPdf(folder, relative);
  if (!filePath) return res.status(404).json({ message: "Document not found" });

  const file = fs.readFileSync(filePath);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${path.basename(filePath)}"`
  );
  res.setHeader("Content-Length", file.length);
  return res.status(200).send(file);
}
