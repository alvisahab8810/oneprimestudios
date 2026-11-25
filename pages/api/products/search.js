// pages/api/products/search.js
// GET ?q= — the header search. Small, fast answers for a type-ahead box:
// a handful of products and the categories that match, nothing else.
//
// Every word typed has to be found somewhere on the product — its name, short
// description, SKU, slug or its category's name — so "flex banner" finds a
// product named "Banner" that sits in the "Flex Printing" category.
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { B2B, resolveAudience, visibleFor } from "@/lib/audience";

const MAX_PRODUCTS = 12;
const MAX_CATEGORIES = 4;
const MAX_WORDS = 6;

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Where the best matches go first: a name that starts with what was typed,
// then a name that contains it, then everything found through other fields.
function rank(product, query) {
  const name = String(product.name || "").toLowerCase();
  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.includes(query)) return 2;
  return 3;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const query = String(req.query.q || "").trim().slice(0, 80);
  if (query.length < 2) {
    return res.status(200).json({ query, products: [], categories: [] });
  }

  try {
    await dbConnect();

    // The same visibility rule as the catalogue: the login cookie decides which
    // side's products may be found, so search can never leak the other side.
    const audience = resolveAudience(req, req.query.userType);
    const visible = visibleFor(audience);

    const words = query.split(/\s+/).filter(Boolean).slice(0, MAX_WORDS);

    // Categories whose name matches any word — their products count as matches
    const categoryMatches = await Category.find({
      categoryFor: { $in: visible },
      $or: words.map((w) => ({ name: { $regex: escapeRegex(w), $options: "i" } })),
    })
      .select("name slug image")
      .lean();

    const categoryIdsFor = (word) => {
      const re = new RegExp(escapeRegex(word), "i");
      return categoryMatches.filter((c) => re.test(c.name)).map((c) => c._id);
    };

    const filter = {
      status: "published",
      productFor: { $in: visible },
      $and: words.map((word) => {
        const re = { $regex: escapeRegex(word), $options: "i" };
        const anyOf = [{ name: re }, { shortDescription: re }, { sku: re }, { slug: re }];
        const ids = categoryIdsFor(word);
        if (ids.length) anyOf.push({ category: { $in: ids } });
        return { $or: anyOf };
      }),
    };

    const found = await Product.find(filter)
      .select("name slug mainImage basePrice salePrice category b2cOptions.bogo b2cOptions.enabled")
      .populate("category", "name slug")
      .limit(60)
      .lean();

    const lowered = query.toLowerCase();
    const products = found
      .sort((a, b) => rank(a, lowered) - rank(b, lowered) || a.name.localeCompare(b.name))
      .slice(0, MAX_PRODUCTS)
      .map((p) => {
        const sale = Number(p.salePrice) || 0;
        const base = Number(p.basePrice) || 0;
        return {
          _id: String(p._id),
          name: p.name,
          slug: p.slug,
          image: p.mainImage || "",
          category: p.category?.name || "",
          // Partner prices depend on quantity and city, so one number here
          // would mislead — the price is shown to retail visitors only.
          price: audience === B2B ? null : sale > 0 ? sale : base > 0 ? base : null,
          offer:
            audience !== B2B && p.b2cOptions?.enabled && p.b2cOptions?.bogo?.enabled
              ? `Buy ${Math.max(1, p.b2cOptions.bogo.buyQty || 1)} Get ${Math.max(1, p.b2cOptions.bogo.getQty || 1)} Free`
              : "",
        };
      });

    const categories = categoryMatches.slice(0, MAX_CATEGORIES).map((c) => ({
      _id: String(c._id),
      name: c.name,
      slug: c.slug,
    }));

    return res.status(200).json({ query, products, categories });
  } catch (err) {
    console.error("Product search error:", err);
    return res.status(500).json({ message: "Search is not available right now" });
  }
}
