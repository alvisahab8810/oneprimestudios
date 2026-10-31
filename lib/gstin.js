// GSTIN validation, shared by the checkout form and the order API so the
// browser and the server never disagree on what a valid number looks like.
//
// A GSTIN is 15 characters: a 2-digit state code, the holder's 10-character
// PAN, a 1-character entity number, the letter Z, and a check character
// computed from the first 14.

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 01-38 are the states and union territories; 97 is "other territory" and 99
// is the centre's own jurisdiction
const VALID_STATE_CODE = (code) => {
  const n = Number(code);
  return (n >= 1 && n <= 38) || n === 97 || n === 99;
};

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

// The last character is a mod-36 check over the first 14, so a typo in any
// one of them is caught here rather than by the GST portal weeks later
const checkCharacter = (first14) => {
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const value = ALPHABET.indexOf(first14[i]);
    if (value < 0) return "";
    const product = value * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return ALPHABET[(36 - (sum % 36)) % 36];
};

export const normalizeGstin = (value) =>
  String(value || "").replace(/\s+/g, "").toUpperCase();

export function isValidGstin(value) {
  const gstin = normalizeGstin(value);
  if (gstin.length !== 15) return false;
  if (!GSTIN_PATTERN.test(gstin)) return false;
  if (!VALID_STATE_CODE(gstin.slice(0, 2))) return false;
  return checkCharacter(gstin.slice(0, 14)) === gstin[14];
}

// The message the buyer sees, naming the part that is actually wrong
export function gstinError(value) {
  const gstin = normalizeGstin(value);
  if (!gstin) return "GST number is required for a GST invoice.";
  if (gstin.length !== 15) return "A GSTIN is exactly 15 characters.";
  if (!VALID_STATE_CODE(gstin.slice(0, 2))) {
    return "The first two digits are not a valid state code.";
  }
  if (!GSTIN_PATTERN.test(gstin)) {
    return "This does not look like a GSTIN. The format is 22AAAAA0000A1Z5.";
  }
  if (checkCharacter(gstin.slice(0, 14)) !== gstin[14]) {
    return "This GSTIN failed its check digit. Please re-check the number.";
  }
  return "";
}
