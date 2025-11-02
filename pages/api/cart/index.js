// // /pages/api/cart/index.js
// import dbConnect from "@/lib/dbConnect";
// import Cart from "@/models/Cart";
// import { getUserFromToken } from "@/lib/getUserFromToken";

// export default async function handler(req, res) {
//   await dbConnect();

//   const user = await getUserFromToken(req);
//   if (!user) return res.status(401).json({ message: "Invalid token" });

//   if (req.method === "GET") {
//     const cart = await Cart.findOne({ user: user._id }).populate("items.product");
//     return res.status(200).json(cart?.items || []);
//   }

//   if (req.method === "POST") {
//     const { productId, quantity, selectedAttrs, uploadedFiles, price } = req.body;

//     let cart = await Cart.findOne({ user: user._id });
//     if (!cart) cart = await Cart.create({ user: user._id, items: [] });

//     const existingIndex = cart.items.findIndex(
//       (item) =>
//         item.product.toString() === productId &&
//         JSON.stringify(item.selectedAttrs) === JSON.stringify(selectedAttrs)
//     );

//     if (existingIndex > -1) {
//       cart.items[existingIndex].quantity += quantity;
//       cart.items[existingIndex].price += price;
//     } else {
//       cart.items.push({ product: productId, quantity, selectedAttrs, uploadedFiles, price });
//     }

//     await cart.save();
//     return res.status(200).json(cart.items);
//   }

//   if (req.method === "DELETE") {
//     const { itemIndex } = req.body;
//     const cart = await Cart.findOne({ user: user._id });
//     if (!cart) return res.status(400).json({ message: "Cart is empty" });

//     cart.items.splice(itemIndex, 1);
//     await cart.save();
//     return res.status(200).json(cart.items);
//   }

//   res.status(405).json({ message: "Method not allowed" });
// }



// pages/api/cart/index.js
import dbConnect from "@/lib/dbConnect";
import getUserFromToken from "@/lib/getUserFromToken";
import Cart from "@/models/Cart";
import Product from "@/models/Product";

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
      const { productId, quantity = 1, selectedAttrs = {}, uploadedFiles = [], price = 0 } = req.body;
      if (!productId) return res.status(400).json({ message: "productId required" });

      // Ensure product exists
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });

      // price coming from frontend may be total price for requested quantity.
      // We'll store unitPrice on the cart item for consistent recalculation.
      const unitPrice = Number(quantity > 0 ? price / quantity : price) || Number(product.salePrice ?? product.basePrice ?? 0);

      // get or create cart
      let cart = await Cart.findOne({ user: user._id });
      if (!cart) {
        cart = new Cart({ user: user._id, items: [] });
      }

      // try to find existing item with same product and same selectedAttrs (simple JSON compare)
      const matchIndex = cart.items.findIndex((it) => {
        if (String(it.product) !== String(productId)) return false;
        try {
          return JSON.stringify(it.selectedAttrs || {}) === JSON.stringify(selectedAttrs || {});
        } catch {
          return false;
        }
      });

      if (matchIndex > -1) {
        // merge quantities
        cart.items[matchIndex].quantity += Number(quantity);
        // update unit price if needed
        cart.items[matchIndex].price = unitPrice;
      } else {
        cart.items.push({
          product: productId,
          quantity: Number(quantity),
          selectedAttrs,
          uploadedFiles: uploadedFiles || [],
          price: unitPrice, // store unit price
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

      cart.items[itemIndex].quantity = Number(quantity < 1 ? 1 : quantity);
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
