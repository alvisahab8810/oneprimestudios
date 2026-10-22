




// // pages/api/cart/index.js
// import dbConnect from "@/lib/dbConnect";
// import getUserFromToken from "@/lib/getUserFromToken";
// import Cart from "@/models/Cart";
// import Product from "@/models/Product";

// export default async function handler(req, res) {
//   await dbConnect();

//   // resolve user
//   const user = await getUserFromToken(req.headers.authorization);
//   if (!user) return res.status(401).json({ message: "Unauthorized" });

//   try {
//     // GET -> return cart (populate product)
//     if (req.method === "GET") {
//       let cart = await Cart.findOne({ user: user._id }).populate("items.product");
//       if (!cart) {
//         cart = await Cart.create({ user: user._id, items: [] });
//         cart = await cart.populate("items.product");
//       }
//       return res.json(cart.items);
//     }

//     // POST -> add item to cart
//     if (req.method === "POST") {
//    const {
//   productId,
//   quantity = 1,
//   selectedAttrs = {},
//   uploadedFiles = [],
//   uploadedAttributeFiles = [], // ✅ ADD
//   price = 0,
//   remarks = "",
// } = req.body;

//       if (!productId) return res.status(400).json({ message: "productId required" });

//       // Ensure product exists
//       const product = await Product.findById(productId);
//       if (!product) return res.status(404).json({ message: "Product not found" });

//       // price coming from frontend may be total price for requested quantity.
//       // We'll store unitPrice on the cart item for consistent recalculation.
//       const unitPrice = Number(quantity > 0 ? price / quantity : price) || Number(product.salePrice ?? product.basePrice ?? 0);

//       // get or create cart
//       let cart = await Cart.findOne({ user: user._id });
//       if (!cart) {
//         cart = new Cart({ user: user._id, items: [] });
//       }

//       // try to find existing item with same product and same selectedAttrs (simple JSON compare)
//       const matchIndex = cart.items.findIndex((it) => {
//         if (String(it.product) !== String(productId)) return false;
//         try {
//           return JSON.stringify(it.selectedAttrs || {}) === JSON.stringify(selectedAttrs || {});
//         } catch {
//           return false;
//         }
//       });

//       if (matchIndex > -1) {
//         // merge quantities
//         cart.items[matchIndex].quantity += Number(quantity);
//         // update unit price if needed
//         cart.items[matchIndex].price = unitPrice;
//         // overwrite remarks if user re-adds item
// if (remarks) {
//   cart.items[matchIndex].remarks = remarks;
// }


// if (uploadedAttributeFiles?.length) {
//   cart.items[matchIndex].uploadedAttributeFiles = uploadedAttributeFiles;
// }

//       } else {
//       cart.items.push({
//   product: productId,
//   quantity: Number(quantity),
//   selectedAttrs,
//   uploadedFiles: uploadedFiles || [],
//   uploadedAttributeFiles: uploadedAttributeFiles || [], // ✅ ADD
//   price: unitPrice,
//   remarks: remarks || "",
// });

//       }

//       await cart.save();
//       cart = await cart.populate("items.product");
//       return res.json(cart.items);
//     }

//     // PUT -> update quantity of an item (body: { itemIndex, quantity })
//     if (req.method === "PUT") {
//       const { itemIndex, quantity } = req.body;
//       if (typeof itemIndex !== "number" || typeof quantity !== "number")
//         return res.status(400).json({ message: "itemIndex and quantity required" });

//       let cart = await Cart.findOne({ user: user._id });
//       if (!cart) return res.status(404).json({ message: "Cart not found" });

//       if (!cart.items[itemIndex]) return res.status(400).json({ message: "Invalid itemIndex" });

//       cart.items[itemIndex].quantity = Number(quantity < 1 ? 1 : quantity);
//       await cart.save();
//       cart = await cart.populate("items.product");
//       return res.json(cart.items);
//     }

//     // DELETE -> remove item by index (body: { itemIndex })
//     if (req.method === "DELETE") {
//       const { itemIndex } = req.body;
//       if (typeof itemIndex !== "number") return res.status(400).json({ message: "itemIndex required" });

//       let cart = await Cart.findOne({ user: user._id });
//       if (!cart) return res.status(404).json({ message: "Cart not found" });

//       if (!cart.items[itemIndex]) return res.status(400).json({ message: "Invalid itemIndex" });

//       cart.items.splice(itemIndex, 1);
//       await cart.save();
//       cart = await cart.populate("items.product");
//       return res.json(cart.items);
//     }

//     return res.status(405).json({ message: "Method not allowed" });
//   } catch (err) {
//     console.error("Cart API error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// }










// pages/api/cart/index.js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Cart from "@/models/Cart";
import Product from "@/models/Product";
import { findMissingRequiredAttr, missingAttrMessage, attrUploadKey } from "@/lib/productAttrs";
import { checkOrderable } from "@/lib/stockRules";
import { checkDeliverable } from "@/lib/deliveryZones";
import { priceForQuantity } from "@/lib/productPricing";

export default async function handler(req, res) {
  await dbConnect();

  // resolve user
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  try {
    // GET -> return cart (populate product)
    if (req.method === "GET") {
      let cart = await Cart.findOne({ user: user._id }).populate("items.product");
      if (!cart) {
        cart = await Cart.create({ user: user._id, items: [] });
        cart = await cart.populate("items.product");
      }
      return res.json(cart.items);
    }

    // POST -> add item to cart
    if (req.method === "POST") {
   const {
  productId,
  quantity = 1,
  selectedAttrs = {},
  uploadedFiles = [],
  uploadedAttributeFiles = [],
  remarks = "",
  // NEW: B2B mandatory order name
  orderName = "",
} = req.body;

      if (!productId) return res.status(400).json({ message: "productId required" });

      // Ensure product exists
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });

      // Out-of-stock products and quantities below the minimum are refused here,
      // not only in the browser
      const orderProblem = checkOrderable(product, quantity);
      if (orderProblem) return res.status(400).json({ message: orderProblem });

      // A product limited to certain PIN codes cannot be added by a buyer
      // outside them. A buyer with no PIN code on file is let through here and
      // checked again at checkout, where the delivery address is known.
      const deliveryProblem = checkDeliverable(product, user.pinCode);
      if (deliveryProblem) return res.status(400).json({ message: deliveryProblem });

      // Attributes the admin marked "Required" must be filled before adding to cart
      const missingAttr = findMissingRequiredAttr(
        product.attributes,
        selectedAttrs,
        (attr, index) =>
          (uploadedAttributeFiles || []).some(
            (f) => f?.url && (f.attributeName === attr.name || f.attributeKey === attrUploadKey(attr, index))
          )
      );
      if (missingAttr) return res.status(400).json({ message: missingAttrMessage(missingAttr) });

      // The price is worked out here, never taken from the browser, and stored
      // per unit so a line's subtotal is simply unit price times quantity.
      const unitPrice = priceForQuantity(product, quantity, {
        selectedAttrs,
        city: user.city,
      }).unitPrice;

      // get or create cart
      let cart = await Cart.findOne({ user: user._id });
      if (!cart) {
        cart = new Cart({ user: user._id, items: [] });
      }


    // A partner builds one job at a time, so for them a different product still
    // replaces whatever is in the cart. A retail cart holds many products.
    const isPartnerCart = user.userType === "partner";

    if (
      isPartnerCart &&
      cart.items.length > 0 &&
      String(cart.items[0].product) !== String(productId)
    ) {
      cart.items = [];
    }

    // Adding the same product again bumps the quantity on the line already in
    // the cart instead of creating a duplicate row. For a partner the order
    // name is part of what makes a line: two jobs named differently stay apart,
    // the same job added twice simply adds up.
    const attrKey = (attrs) =>
      JSON.stringify(
        Object.keys(attrs || {})
          .sort()
          .map((k) => [k, attrs[k]])
      );

    const hasNewFiles =
      (uploadedFiles || []).length > 0 || (uploadedAttributeFiles || []).length > 0;

    // A second identical request moments after the first is a double submit —
    // a double click or a retried request — not a genuine second line
    const justAdded =
      !hasNewFiles &&
      cart.updatedAt &&
      Date.now() - new Date(cart.updatedAt).getTime() < 5000 &&
      cart.items.find(
        (item) =>
          String(item.product) === String(productId) &&
          Number(item.quantity) === Number(quantity) &&
          (item.uploadedFiles || []).length === 0 &&
          (item.uploadedAttributeFiles || []).length === 0 &&
          String(item.orderName || "") === String(orderName || "") &&
          String(item.remarks || "") === String(remarks || "") &&
          attrKey(item.selectedAttrs) === attrKey(selectedAttrs)
      );

    if (justAdded) {
      cart = await cart.populate("items.product");
      return res.json(cart.items);
    }

    const sameLine = (item) =>
      String(item.product) === String(productId) &&
      attrKey(item.selectedAttrs) === attrKey(selectedAttrs) &&
      String(item.orderName || "") === String(orderName || "");

    // A partner's line also merges when artwork is attached — the files are
    // carried onto the line it merges into, so nothing uploaded is lost.
    const existingLine = isPartnerCart
      ? cart.items.find(sameLine)
      : !hasNewFiles
      ? cart.items.find(
          (item) =>
            sameLine(item) &&
            (item.uploadedFiles || []).length === 0 &&
            (item.uploadedAttributeFiles || []).length === 0
        )
      : null;

    if (existingLine) {
      const mergedQty = Number(existingLine.quantity || 0) + Number(quantity);

      // The combined quantity has to clear stock and MOQ rules as well
      const mergeIssue = checkOrderable(product, mergedQty);
      if (mergeIssue) return res.status(400).json({ message: mergeIssue });

      existingLine.quantity = mergedQty;
      // The merged quantity may reach a cheaper slab, so the line is priced again
      existingLine.price = priceForQuantity(product, mergedQty, {
        selectedAttrs,
        city: user.city,
      }).unitPrice;
      if (remarks) existingLine.remarks = remarks;
      if (orderName) existingLine.orderName = orderName;

      if (hasNewFiles) {
        // A fresh upload for the same attribute slot replaces the old one;
        // every other file already on the line is kept
        const slotOf = (f) => f?.attributeKey || f?.attributeName || f?.url;
        const newSlots = new Set((uploadedAttributeFiles || []).map(slotOf));
        existingLine.uploadedAttributeFiles = [
          ...(existingLine.uploadedAttributeFiles || []).filter(
            (f) => !newSlots.has(slotOf(f))
          ),
          ...(uploadedAttributeFiles || []),
        ];

        const seenUrls = new Set(
          (existingLine.uploadedFiles || []).map((f) => f?.url || f)
        );
        existingLine.uploadedFiles = [
          ...(existingLine.uploadedFiles || []),
          ...(uploadedFiles || []).filter((f) => !seenUrls.has(f?.url || f)),
        ];
      }
    } else {
      cart.items.push({
        product: productId,
        quantity: Number(quantity),
        selectedAttrs,
        uploadedFiles: uploadedFiles || [],
        uploadedAttributeFiles: uploadedAttributeFiles || [],
        price: unitPrice,
        remarks: remarks || "",
        // NEW: order name stored per cart item, carried through to order
        orderName: orderName || "",
        createdAt: new Date(),
      });
    }


      await cart.save();
      cart = await cart.populate("items.product");
      return res.json(cart.items);
    }

    // PUT -> update quantity of an item (body: { itemIndex, quantity })
    if (req.method === "PUT") {
      const { itemIndex, quantity } = req.body;
      if (typeof itemIndex !== "number" || typeof quantity !== "number")
        return res.status(400).json({ message: "itemIndex and quantity required" });

      let cart = await Cart.findOne({ user: user._id });
      if (!cart) return res.status(404).json({ message: "Cart not found" });

      if (!cart.items[itemIndex]) return res.status(400).json({ message: "Invalid itemIndex" });

      // The new quantity must still respect the product's minimum order quantity
      const item = cart.items[itemIndex];
      const itemProduct = await Product.findById(item.product);
      const qtyProblem = checkOrderable(itemProduct, quantity);
      if (qtyProblem) return res.status(400).json({ message: qtyProblem });

      cart.items[itemIndex].quantity = Number(quantity);
      // Quantity pricing only works if the line is priced again for the new
      // quantity — otherwise the slab the buyer first landed on is kept forever.
      cart.items[itemIndex].price = priceForQuantity(itemProduct, quantity, {
        selectedAttrs: cart.items[itemIndex].selectedAttrs,
        city: user.city,
      }).unitPrice;
      await cart.save();
      cart = await cart.populate("items.product");
      return res.json(cart.items);
    }

    // DELETE -> remove item by index (body: { itemIndex })
    if (req.method === "DELETE") {
      const { itemIndex } = req.body;
      if (typeof itemIndex !== "number") return res.status(400).json({ message: "itemIndex required" });

      let cart = await Cart.findOne({ user: user._id });
      if (!cart) return res.status(404).json({ message: "Cart not found" });

      if (!cart.items[itemIndex]) return res.status(400).json({ message: "Invalid itemIndex" });

      cart.items.splice(itemIndex, 1);
      await cart.save();
      cart = await cart.populate("items.product");
      return res.json(cart.items);
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    console.error("Cart API error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
