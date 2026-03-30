import nextConnect from "next-connect";
import multer from "multer";
import path from "path";
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import Category from "@/models/Category";

const uploadDir = path.join(process.cwd(), "public/uploads/products");

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

const handler = nextConnect({
  onError(err, req, res) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  },
});

handler.use(
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "gallery", maxCount: 20 },
  ])
);

handler.put(async (req, res) => {
  await dbConnect();
  const { id } = req.query;

  try {
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const safeParse = (str, def) => {
      try {
        return str ? JSON.parse(str) : def;
      } catch {
        return def;
      }
    };

    const {
      name,
      slug,
      shortDescription,
      description,
      ourSpecialization,
      importantNotes,
      categoryId,
      basePrice,
      salePrice,
      stock,
      stockStatus,
      minOrderQty,
      isFeatured,
      gstPercent,
      attributes,
      pricingTiers,
      b2bOptions,
      b2cOptions,
      existingGallery,
    } = req.body;

    // 🔥 SLUG VALIDATION
    if (slug) {
      const slugExists = await Product.findOne({
        slug: slug,
        _id: { $ne: product._id },
      });

      if (slugExists) {
        return res.status(400).json({
          message: "Slug already taken. Please choose another.",
        });
      }
    }

    // 🔥 MAIN IMAGE
    let finalMainImage = product.mainImage;
    if (req.files?.mainImage?.[0]) {
      finalMainImage = `/uploads/products/${req.files.mainImage[0].filename}`;
    }

    // 🔥 GALLERY MERGING
    let oldGallery = [];
    if (existingGallery) {
      oldGallery = existingGallery.split(",").filter(Boolean);
    }

    let newGallery = [];
    if (req.files?.gallery) {
      newGallery = req.files.gallery.map(
        (f) => `/uploads/products/${f.filename}`
      );
    }

    const finalGallery = [...oldGallery, ...newGallery];

    // 🔥 CATEGORY VALIDATION
    const category = await Category.findById(categoryId);
    if (!category)
      return res.status(400).json({ message: "Invalid category selected" });

    // 🔥 FINAL PAYLOAD
    const updateData = {
      name,
      slug,
      shortDescription,
      description,
      ourSpecialization,
      importantNotes,
      mainImage: finalMainImage,
      gallery: finalGallery,
      category: category._id,
      basePrice: Number(basePrice),
      salePrice: salePrice ? Number(salePrice) : undefined,
      stock: stock ? Number(stock) : 0,
      stockStatus,
      minOrderQty: Number(minOrderQty),
      isFeatured: isFeatured === "true" || isFeatured === true,
      gstPercent: gstPercent ? Number(gstPercent) : 0,
      attributes: safeParse(attributes, []),
      pricingTiers: safeParse(pricingTiers, []),
      b2bOptions: safeParse(b2bOptions, {}),
      b2cOptions: safeParse(b2cOptions, {}),
    };

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res.status(200).json(updatedProduct);
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ message: err.message });
  }
});

export const config = { api: { bodyParser: false } };
export default handler;
