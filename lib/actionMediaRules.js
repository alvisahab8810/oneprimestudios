// Upload limits for the homepage "See it in Action" slider. Kept in one place
// so the admin screen can state the same rules the server enforces.

export const IMAGE_MAX_BYTES = 300 * 1024; // 300 KB
export const VIDEO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const IMAGE_MIME = ["image/webp"];
export const VIDEO_MIME = ["video/mp4", "video/webm"];

export const IMAGE_EXT = [".webp"];
export const VIDEO_EXT = [".mp4", ".webm"];

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MB";
  return Math.round(n / 1024) + " KB";
}

// Some browsers send an empty or generic MIME type, so the extension is the
// fallback — the same approach the product file uploader already uses.
export function mediaKind(mime, filename) {
  const ext = "." + String(filename || "").split(".").pop().toLowerCase();

  if (IMAGE_MIME.includes(mime) || IMAGE_EXT.includes(ext)) return "image";
  if (VIDEO_MIME.includes(mime) || VIDEO_EXT.includes(ext)) return "video";
  return null;
}

// Returns an error message, or "" when the file is acceptable
export function checkMedia({ mime, filename, size }) {
  const kind = mediaKind(mime, filename);

  if (!kind) {
    return "Only WebP images and MP4 or WebM videos can be uploaded.";
  }

  if (kind === "image" && size > IMAGE_MAX_BYTES) {
    return `Images must be ${formatBytes(IMAGE_MAX_BYTES)} or smaller. This one is ${formatBytes(size)}.`;
  }

  if (kind === "video" && size > VIDEO_MAX_BYTES) {
    return `Videos must be ${formatBytes(VIDEO_MAX_BYTES)} or smaller. This one is ${formatBytes(size)}.`;
  }

  return "";
}
