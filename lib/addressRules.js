// One set of rules for every saved delivery address, so an address accepted on
// the address book is an address checkout will also accept.

export const ADDRESS_LABELS = ["Home", "Work", "Other"];

export function normalizeAddress(body = {}) {
  const label = String(body.label || "").trim();
  return {
    label: ADDRESS_LABELS.includes(label) ? label : "Home",
    name: String(body.name || "").trim(),
    phone: String(body.phone || "").trim(),
    street: String(body.street || "").trim(),
    city: String(body.city || "").trim(),
    state: String(body.state || "").trim(),
    pinCode: String(body.pinCode || "").trim(),
  };
}

export function validateAddress({ name, phone, street, city, state, pinCode }) {
  const errors = {};

  if (!name) errors.name = "Full name is required.";
  else if (!/^[A-Za-z\s]+$/.test(name)) errors.name = "Name can only contain letters.";

  if (!phone) errors.phone = "Phone number is required.";
  else if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = "Phone number must be 10 digits.";

  if (!street) errors.street = "Street address is required.";
  else if (street.length < 5) errors.street = "Street address seems too short.";

  if (!city) errors.city = "City is required.";
  if (!state) errors.state = "State is required.";

  if (!pinCode) errors.pinCode = "Pin code is required.";
  else if (!/^\d{6}$/.test(pinCode)) errors.pinCode = "Pin code must be 6 digits.";

  return errors;
}

// Accounts created before the address book kept a single address in these
// fields. The first time the book is opened that one is carried into the list,
// so nobody has to retype an address they already gave us.
export function legacyAddressOf(user) {
  const street = String(user?.businessAddress || "").trim();
  if (!street) return null;

  return {
    label: "Home",
    name: String(user.name || "").trim(),
    phone: String(user.phone || "").trim(),
    street,
    city: String(user.city || "").trim(),
    state: String(user.state || "").trim(),
    pinCode: String(user.pinCode || "").trim(),
    isDefault: true,
  };
}

// The default address stays mirrored onto the old fields, because checkout and
// the partner profile still read the address from there.
export function mirrorDefaultAddress(dbUser) {
  const fallback = (dbUser.addresses || []).find((a) => a.isDefault) || (dbUser.addresses || [])[0];
  if (!fallback) return;

  dbUser.businessAddress = fallback.street;
  dbUser.city = fallback.city;
  dbUser.state = fallback.state;
  dbUser.pinCode = fallback.pinCode;
}

// The default address is always shown first, which is the order checkout and
// the address book both present it in.
export const sortAddresses = (list) =>
  [...(list || [])].sort((x, y) => Number(!!y.isDefault) - Number(!!x.isDefault));
