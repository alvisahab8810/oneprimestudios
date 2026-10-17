// Cash on delivery is offered on every retail product. An admin can switch it
// off for a single product, and products saved before this rule carry no flag
// at all, so they are available by default.

export function isCodAvailable(product) {
  if (!product) return false;
  return !product?.b2cOptions?.codDisabled;
}

// Every line in the cart has to allow it, otherwise the whole order is online
export function cartAllowsCod(items = []) {
  return (
    items.length > 0 && items.every((item) => isCodAvailable(item?.product || item))
  );
}
