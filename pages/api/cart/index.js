




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
  price = 0,
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

      // Attributes the admin marked "Required" must be filled before adding to cart
      const missingAttr = findMissingRequiredAttr(
        product.attributes,
        selectedAttrs,
        (attr, index) =>
          (uploadedAttributeFiles || []).some(
            (f) => f?.url && (f.attributeName === attr.name || f.attributeKey === attrUploadKey(attr, index))
          ),
        { uploadsOnly: !product.b2bOptions?.enabled }
      );
      if (missingAttr) return res.status(400).json({ message: missingAttrMessage(missingAttr) });

      // price coming from frontend may be total price for requested quantity.
      // We'll store unitPrice on the cart item for consistent recalculation.
      const unitPrice = Number(quantity > 0 ? price / quantity : price) || Number(product.salePrice ?? product.basePrice ?? 0);

      // get or create cart
      let cart = await Cart.findOne({ user: user._id });
      if (!cart) {
        cart = new Cart({ user: user._id, items: [] });
      }


    // ✅ SINGLE-PRODUCT RESTRICTION: clear cart if a different product is being added
    if (cart.items.length > 0 && String(cart.items[0].product) !== String(productId)) {
      cart.items = [];
    }

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
