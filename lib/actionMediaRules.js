// Upload limits for the media an admin manages from the dashboard. Kept in one
// place so the admin screen can state the same rules the server enforces.

export const IMAGE_MAX_BYTES = 300 * 1024; // 300 KB
export const VIDEO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const IMAGE_MIME = ["image/webp"];
export const VIDEO_MIME = ["video/mp4", "video/webm"];

export const IMAGE_EXT = [".webp"];
export const VIDEO_EXT = [".mp4", ".webm"];

// A banner fills the whole width of the screen, so it needs more room than a
// slider thumbnail, and the artwork is not always a WebP.
export const BANNER_MAX_BYTES = 1024 * 1024; // 1 MB
export const BANNER_MIME = ["image/webp", "image/png", "image/jpeg"];
export const BANNER_EXT = [".webp", ".png", ".jpg", ".jpeg"];

// Each area of the website an admin can fill from this one screen.
export const SECTIONS = [
  {
    id: "action",
    label: "See it in Action",
    where: "Photo and video slider on the home page",
    // "media" takes an image or a video, "banner" one wide image
    kind: "media",
    // The size the artwork is drawn at. The slide is a 2:1 card that never
    // renders wider than 800px, so this is twice that for sharp screens.
    width: 1600,
    height: 800,
    shape: "2 : 1 (twice as wide as it is tall)",
    now: "The three photos on the site today are 1200 x 600.",
  },
  {
    id: "hero-desktop",
    label: "Home Banner (Computer)",
    where: "Big banner at the top of the home page on computers",
    kind: "banner",
    // Exactly the banner the site ships with, so nothing shifts on the page
    width: 1920,
    height: 945,
    shape: "2.03 : 1 (a wide strip)",
    now: "The banner on the site today is 1920 x 945.",
  },
  {
    id: "hero-mobile",
    label: "Home Banner (Mobile)",
    where: "Banner at the top of the home page on phones",
    kind: "banner",
    width: 1080,
    height: 640,
    shape: "1.69 : 1",
    now: "The banner on the site today is 537 x 320, which looks soft on a modern phone — use the size above instead.",
  },
  {
    id: "products-info",
    label: "Products Page Notices",
    where: "Full width image strip above the product list",
    kind: "banner",
    width: 1600,
    height: 400,
    shape: "4 : 1 (a long, short strip)",
    now: "Keep any wording inside the middle of the artwork — the edges are trimmed on narrow screens.",
  },
];

export const DEFAULT_SECTION = "action";

export function getSection(id) {
  return SECTIONS.find((s) => s.id === id) || SECTIONS[0];
}

export function isSection(id) {
  return SECTIONS.some((s) => s.id === id);
}

export function sectionKind(id) {
  return getSection(id).kind;
}

// The artwork size for a section, spelled out for whoever is preparing the file
export function sectionSize(id) {
  const s = getSection(id);
  return {
    width: s.width,
    height: s.height,
    label: `${s.width} x ${s.height} px`,
    shape: s.shape,
    now: s.now || "",
  };
}

// A slide may only link to a page on this website, so it can never send a
// visitor elsewhere. Returns the cleaned path, "" for none, or null if invalid.
const LINK_RE = /^\/[\w\-./?=&%]*$/;

export function cleanLink(value) {
  const link = String(value || "").trim();
  if (!link) return "";
  return LINK_RE.test(link) ? link.slice(0, 200) : null;
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MB";
  return Math.round(n / 1024) + " KB";
}

// Some browsers send an empty or generic MIME type, so the extension is the
// fallback — the same approach the product file uploader already uses.
export function mediaKind(mime, filename, section = DEFAULT_SECTION) {
  const ext = "." + String(filename || "").split(".").pop().toLowerCase();

  if (sectionKind(section) === "banner") {
    return BANNER_MIME.includes(mime) || BANNER_EXT.includes(ext) ? "image" : null;
  }

  if (IMAGE_MIME.includes(mime) || IMAGE_EXT.includes(ext)) return "image";
  if (VIDEO_MIME.includes(mime) || VIDEO_EXT.includes(ext)) return "video";
  return null;
}

// Returns an error message, or "" when the file is acceptable
export function checkMedia({ mime, filename, size, section = DEFAULT_SECTION }) {
  const kind = mediaKind(mime, filename, section);

  if (sectionKind(section) === "banner") {
    if (!kind) return "A banner has to be a WebP, PNG or JPG image.";
    if (size > BANNER_MAX_BYTES) {
      return `Banner images must be ${formatBytes(BANNER_MAX_BYTES)} or smaller. This one is ${formatBytes(size)}.`;
    }
    return "";
  }

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

// What the file picker on the admin screen should offer
export function acceptAttr(section) {
  if (sectionKind(section) === "banner") {
    return ".webp,.png,.jpg,.jpeg,image/webp,image/png,image/jpeg";
  }
  return ".webp,image/webp,.mp4,video/mp4,.webm,video/webm";
}

// The rules spelled out for whoever is uploading
export function sectionHint(section) {
  const kind = sectionKind(section);
  const { label } = sectionSize(section);

  if (kind === "banner") {
    return `Save the artwork at ${label} as a WebP, up to ${formatBytes(BANNER_MAX_BYTES)}. PNG and JPG also work, but WebP is a far smaller file at the same quality.`;
  }

  return `Save the artwork at ${label} as a WebP, up to ${formatBytes(IMAGE_MAX_BYTES)}. Videos can be MP4 or WebM up to ${formatBytes(VIDEO_MAX_BYTES)}.`;
}
