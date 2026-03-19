import dbConnect from "@/lib/dbConnect";
import Wishlist from "@/models/Wishlist";
import Product from "@/models/Product";
import getUserFromToken from "@/lib/getUserFromToken";

export default async function handler(req, res) {
  await dbConnect();

  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const userId = user._id;

  // GET wishlist items
  if (req.method === "GET") {
    const wishlist = await Wishlist.findOne({ userId }).populate(
      "items.productId",
      "name slug mainImage basePrice salePrice category"
      // ↑ slug is now explicitly included — fixes the null slug crash
    );

    // Filter out nulls — happens when a product was deleted after being wishlisted
    const items = (wishlist?.items || [])
      .map((i) => i.productId)
      .filter(Boolean);

    return res.json({ items });
  }

  // ADD / REMOVE item (toggle)
  if (req.method === "POST") {
    const { productId } = req.body;
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) wishlist = await Wishlist.create({ userId, items: [] });

    const existing = wishlist.items.find(
      (i) => i.productId.toString() === productId
    );

    if (existing) {
      wishlist.items = wishlist.items.filter(
        (i) => i.productId.toString() !== productId
      );
      await wishlist.save();
      return res.json({ message: "Removed from wishlist" });
    } else {
      wishlist.items.push({ productId });
      await wishlist.save();
      return res.json({ message: "Added to wishlist" });
    }
  }

  return res.status(405).end();
}



// import dbConnect from "@/lib/dbConnect";
// import Wishlist from "@/models/Wishlist";
// import Product from "@/models/Product";
// import getUserFromToken from "@/lib/getUserFromToken";

// export default async function handler(req, res) {
//   await dbConnect();

//   const user = await getUserFromToken(req);
//   if (!user) return res.status(401).json({ message: "Unauthorized" });

//   const userId = user._id;

//   // 🧾 GET wishlist items
//   if (req.method === "GET") {
//     const wishlist = await Wishlist.findOne({ userId }).populate("items.productId");
//     return res.json({ items: wishlist?.items.map((i) => i.productId) || [] });
//   }

//   // ➕ ADD / REMOVE item
//   if (req.method === "POST") {
//     const { productId } = req.body;
//     let wishlist = await Wishlist.findOne({ userId });

//     if (!wishlist) wishlist = await Wishlist.create({ userId, items: [] });

//     const existing = wishlist.items.find(
//       (i) => i.productId.toString() === productId
//     );

//     if (existing) {
//       wishlist.items = wishlist.items.filter(
//         (i) => i.productId.toString() !== productId
//       );
//       await wishlist.save();
//       return res.json({ message: "Removed from wishlist" });
//     } else {
//       wishlist.items.push({ productId });
//       await wishlist.save();
//       return res.json({ message: "Added to wishlist" });
//     }
//   }

//   return res.status(405).end();
// }
