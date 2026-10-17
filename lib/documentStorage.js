// Invoices and e-way bills are kept outside /public, so a PDF can only be
// fetched through a route that checks who is asking. Files written before this
// change still live under /public, so both locations are looked at when an
// existing file is needed.
import fs from "fs";
import path from "path";

const PRIVATE_ROOT = path.join(process.cwd(), "private");

export const INVOICE_DIR = path.join(PRIVATE_ROOT, "invoices");
export const EWAY_DIR = path.join(PRIVATE_ROOT, "eway-bills");

const LEGACY_INVOICE_DIR = path.join(process.cwd(), "public", "invoices");
const LEGACY_EWAY_DIR = path.join(process.cwd(), "public", "eway-bills");

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// An invoice number can carry slashes, which would otherwise turn into folders
export function pdfFilename(invoiceNumber, prefix = "") {
  const safe = String(invoiceNumber || "document").replace(/[\/\\\s]+/g, "-");
  return `${prefix}${safe}.pdf`;
}

// Keeps a request from walking out of the folder it is allowed to read
export function safeJoin(dir, relative) {
  const target = path.resolve(dir, relative);
  const root = path.resolve(dir);
  return target === root || target.startsWith(root + path.sep) ? target : null;
}

// Returns the first copy of a file that exists: the private one, then the old
// public one. Null means nothing is on disk and the PDF has to be rendered.
export function findStoredPdf(kind, relative) {
  const dirs =
    kind === "eway" ? [EWAY_DIR, LEGACY_EWAY_DIR] : [INVOICE_DIR, LEGACY_INVOICE_DIR];

  for (const dir of dirs) {
    const full = safeJoin(dir, relative);
    if (full && fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}
