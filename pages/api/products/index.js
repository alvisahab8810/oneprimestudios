

// pages/api/products/index.js
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
  onNoMatch(req, res) {
    res.status(405).json({ message: "Method not allowed" });
  },
});

// 🔹 GET all products (with userType filter)
// handler.get(async (req, res) => {
//   await dbConnect();
//   try {
//     const { userType } = req.query; // partner / customer
// let filter = { status: "published" }; // add this line

// if (userType === "partner") {
//   filter["b2bOptions.enabled"] = true;
// } else if (userType === "customer") {
//   filter["b2cOptions.enabled"] = true;
// }


//     const products = await Product.find(filter).populate("category");
//     res.status(200).json(products);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

handler.get(async (req, res) => {
  await dbConnect();
  try {
    const { userType } = req.query; // "b2b" | "b2c" | undefined

    let filter = { status: "published" };

    // -------- NON-LOGIN USER --------
    if (!userType) {
      filter.productFor = { $in: ["b2c", "both"] };
    }

    // -------- B2C USER --------
    if (userType === "customer" || userType === "b2c") {
      filter.productFor = { $in: ["b2c", "both"] };
    }

    // -------- B2B USER --------
    if (userType === "partner" || userType === "b2b") {
      filter.productFor = { $in: ["b2b", "both"] };
    }

    const products = await Product.find(filter).populate("category");
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 🔹 POST new product
handler.post(
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  async (req, res) => {
    await dbConnect();
    try {
      const {
        name,
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
         productFor,     // ⭐ ADD THIS
        b2bOptions,
        b2cOptions,
        attributes,
        pricingTiers,
      } = req.body;

      if (!name || !categoryId || basePrice === undefined) {
        return res
          .status(400)
          .json({ message: "name, categoryId, and basePrice are required" });
      }

      const category = await Category.findById(categoryId);
      if (!category)
        return res.status(400).json({ message: "Invalid category" });

      const mainImage = req.files?.mainImage?.[0]
        ? `/uploads/products/${req.files.mainImage[0].filename}`
        : "";
      const gallery = (req.files?.gallery || []).map(
        (f) => `/uploads/products/${f.filename}`
      );

      const safeParse = (str, def) => {
        try {
          return str ? JSON.parse(str) : def;
        } catch {
          return def;
        }
      };

      const parsedAttributes = safeParse(attributes, []);

      // 🔥 Ensure uploadRules.imageDimensions is included
parsedAttributes.forEach(attr => {
  if (attr.type === "upload") {
    attr.uploadRules = attr.uploadRules || {};

    // Normalize acceptTypes (strip dots, lowercase)
    if (attr.uploadRules.acceptTypes) {
      attr.uploadRules.acceptTypes = attr.uploadRules.acceptTypes
        .map(t => t.toLowerCase().replace(".", ""));
    }

    // 🔥 If admin submitted imageDimensions, keep it
    if (!attr.uploadRules.imageDimensions && attr.imageDimensions) {
      attr.uploadRules.imageDimensions = attr.imageDimensions;
    }
  }
});

      const parsedB2B = safeParse(b2bOptions, {});
      const parsedB2C = safeParse(b2cOptions, {});
      const parsedTiers = safeParse(pricingTiers, []);

      const slugify = (text = "") =>
        text
          .toString()
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\w\-]+/g, "")
          .replace(/\-\-+/g, "-");

      let slug = slugify(name);
      let suffix = 1;
      while (await Product.findOne({ slug })) slug = `${slug}-${suffix++}`;

      const product = await Product.create({
        name,
        slug,
        shortDescription,
        description,
        ourSpecialization,
        importantNotes,
        mainImage,
        gallery,
        category: category._id,
        basePrice: Number(basePrice),
        salePrice: salePrice ? Number(salePrice) : undefined,
        stock: stock ? Number(stock) : 0,
        stockStatus: stockStatus || "in_stock",
        minOrderQty: minOrderQty ? Number(minOrderQty) : 1,
        isFeatured: isFeatured === "true" || isFeatured === true,
          productFor: productFor || "both", // ⭐ FINAL FIX ⭐

        attributes: parsedAttributes,
        pricingTiers: parsedTiers,
        b2bOptions: parsedB2B,
        b2cOptions: parsedB2C,
      });

      res.status(201).json(product);
    } catch (err) {
      console.error("Product create error:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

export const config = { api: { bodyParser: false } };
export default handler;





// // pages/api/products/index.js
// import nextConnect from "next-connect";
// import multer from "multer";
// import path from "path";
// import dbConnect from "@/lib/dbConnect";
// import Product from "@/models/Product";
// import Category from "@/models/Category";

// const uploadDir = path.join(process.cwd(), "public/uploads/products");

// const storage = multer.diskStorage({
//   destination: uploadDir,
//   filename: (req, file, cb) => {
//     const safeName = file.originalname.replace(/\s+/g, "-");
//     cb(null, `${Date.now()}-${safeName}`);
//   },
// });
// const upload = multer({ storage });

// const handler = nextConnect({
//   onError(err, req, res) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   },
//   onNoMatch(req, res) {
//     res.status(405).json({ message: "Method not allowed" });
//   },
// });

// // 🔹 GET all products (with userType filter)
// handler.get(async (req, res) => {
//   await dbConnect();
//   try {
//     const { userType } = req.query; // partner / customer
// let filter = { status: "published" }; // add this line

// if (userType === "partner") {
//   filter["b2bOptions.enabled"] = true;
// } else if (userType === "customer") {
//   filter["b2cOptions.enabled"] = true;
// }


//     const products = await Product.find(filter).populate("category");
//     res.status(200).json(products);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // 🔹 POST new product
// handler.post(
//   upload.fields([
//     { name: "mainImage", maxCount: 1 },
//     { name: "gallery", maxCount: 10 },
//   ]),
//   async (req, res) => {
//     await dbConnect();
//     try {
//       const {
//         name,
//         shortDescription,
//         description,
//         ourSpecialization,
//         importantNotes,
//         categoryId,
//         basePrice,
//         salePrice,
//         stock,
//         stockStatus,
//         minOrderQty,
//         isFeatured,
//         b2bOptions,
//         b2cOptions,
//         attributes,
//         pricingTiers,
//       } = req.body;

//       if (!name || !categoryId || basePrice === undefined) {
//         return res
//           .status(400)
//           .json({ message: "name, categoryId, and basePrice are required" });
//       }

//       const category = await Category.findById(categoryId);
//       if (!category)
//         return res.status(400).json({ message: "Invalid category" });

//       const mainImage = req.files?.mainImage?.[0]
//         ? `/uploads/products/${req.files.mainImage[0].filename}`
//         : "";
//       const gallery = (req.files?.gallery || []).map(
//         (f) => `/uploads/products/${f.filename}`
//       );

//       const safeParse = (str, def) => {
//         try {
//           return str ? JSON.parse(str) : def;
//         } catch {
//           return def;
//         }
//       };

//       const parsedAttributes = safeParse(attributes, []);
//       const parsedB2B = safeParse(b2bOptions, {});
//       const parsedB2C = safeParse(b2cOptions, {});
//       const parsedTiers = safeParse(pricingTiers, []);

//       const slugify = (text = "") =>
//         text
//           .toString()
//           .toLowerCase()
//           .trim()
//           .replace(/\s+/g, "-")
//           .replace(/[^\w\-]+/g, "")
//           .replace(/\-\-+/g, "-");

//       let slug = slugify(name);
//       let suffix = 1;
//       while (await Product.findOne({ slug })) slug = `${slug}-${suffix++}`;

//       const product = await Product.create({
//         name,
//         slug,
//         shortDescription,
//         description,
//         ourSpecialization,
//         importantNotes,
//         mainImage,
//         gallery,
//         category: category._id,
//         basePrice: Number(basePrice),
//         salePrice: salePrice ? Number(salePrice) : undefined,
//         stock: stock ? Number(stock) : 0,
//         stockStatus: stockStatus || "in_stock",
//         minOrderQty: minOrderQty ? Number(minOrderQty) : 1,
//         isFeatured: isFeatured === "true" || isFeatured === true,
//         attributes: parsedAttributes,
//         pricingTiers: parsedTiers,
//         b2bOptions: parsedB2B,
//         b2cOptions: parsedB2C,
//       });

//       res.status(201).json(product);
//     } catch (err) {
//       console.error("Product create error:", err);
//       res.status(500).json({ message: err.message });
//     }
//   }
// );

// export const config = { api: { bodyParser: false } };
// export default handler;


