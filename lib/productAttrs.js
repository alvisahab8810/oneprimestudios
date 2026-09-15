// Shared rules for product attributes, used by the product page and the cart API.

// Key used for an upload attribute's file; index is the attribute's position in product.attributes
export const attrUploadKey = (attr, index) =>
  `${String(attr?.name || "attr").trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "")}__${index}`;

export const isAttrRequired = (attr) =>
  !!(attr?.required || (attr?.type === "upload" && attr?.uploadRules?.required));

const isBlank = (v) => (Array.isArray(v) ? v.length === 0 : v === undefined || v === null || String(v).trim() === "");

// Returns the first required attribute that has no valid value, or null when all are filled.
// hasUpload(attr, index) tells whether a file was provided for an upload attribute.
// uploadsOnly: B2C product pages show only upload fields, so only those can be enforced there.
export function findMissingRequiredAttr(attributes, selectedAttrs = {}, hasUpload = () => false, { uploadsOnly = false } = {}) {
  const list = Array.isArray(attributes) ? attributes : [];
  for (let i = 0; i < list.length; i++) {
    const attr = list[i];
    if (!isAttrRequired(attr)) continue;
    if (uploadsOnly && attr.type !== "upload") continue;

    if (attr.type === "upload") {
      if (!hasUpload(attr, i)) return attr;
      continue;
    }

    const value = selectedAttrs?.[attr.name];
    if (isBlank(value)) return attr;

    // A select must hold one of its own options
    if (attr.type === "select" && Array.isArray(attr.values) && attr.values.length) {
      if (!attr.values.some((v) => v.label === value)) return attr;
    }
    if (attr.type === "checkbox" && !Array.isArray(value)) return attr;
  }
  return null;
}

export const missingAttrMessage = (attr) =>
  attr.type === "upload"
    ? `Please upload a file for "${attr.name}"`
    : attr.type === "checkbox"
    ? `Please choose at least one option for "${attr.name}"`
    : attr.type === "select"
    ? `Please select ${attr.name}`
    : `Please enter ${attr.name}`;
