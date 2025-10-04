





// // pages/api/products/index.js
// import nextConnect from "next-connect";
// import multer from "multer";
// import path from "path";
// import fs from "fs";
// import dbConnect from "@/lib/dbConnect";
// import Product from "@/models/Product";
// import Category from "@/models/Category";

// // Ensure upload dir
// const uploadDir = "./public/uploads/products";
// if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// // Multer storage
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadDir),
//   filename: (req, file, cb) => {
//     const safe = file.originalname.replace(/\s+/g, "-");
//     cb(null, `${Date.now()}-${safe}`);
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

// // GET: list products
// handler.get(async (req, res) => {
//   await dbConnect();
//   try {
//     const products = await Product.find().populate("category");
//     res.status(200).json(products);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // POST: create product with files
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
//         ourSpecialization,   // ✅ pick from body
//         importantNotes,      // ✅ pick from body
//         categoryId,
//         regularPrice,
//         salePrice,
//         sku,
//         stock,
//         stockStatus,


//         minOrderQty,
//         isFeatured,
//         b2bOptions,
//         b2cOptions,
//       } = req.body;

//       if (!name || !categoryId || !regularPrice) {
//         return res
//           .status(400)
//           .json({ message: "name, categoryId and regularPrice are required" });
//       }

//       // category existence
//       const category = await Category.findById(categoryId);
//       if (!category) return res.status(400).json({ message: "Invalid category" });

//       // file paths
//       let mainImage = "";
//       if (req.files?.mainImage && req.files.mainImage[0]) {
//         mainImage = `/uploads/products/${req.files.mainImage[0].filename}`;
//       }
//       const gallery = (req.files?.gallery || []).map(
//         (f) => `/uploads/products/${f.filename}`
//       );

//       // parse options
//       let parsedB2B = {};
//       let parsedB2C = {};
//       try {
//         parsedB2B = b2bOptions ? JSON.parse(b2bOptions) : {};
//       } catch (e) {}
//       try {
//         parsedB2C = b2cOptions ? JSON.parse(b2cOptions) : {};
//       } catch (e) {}

//       // slug generation
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
//       while (await Product.findOne({ slug })) {
//         slug = `${slug}-${suffix++}`;
//       }

// const product = await Product.create({
//   name,
//   slug,
//   shortDescription,
//   description,
//   ourSpecialization: Array.isArray(ourSpecialization) 
//     ? ourSpecialization[0] 
//     : ourSpecialization || "",
//   importantNotes: Array.isArray(importantNotes) 
//     ? importantNotes[0] 
//     : importantNotes || "",
//   mainImage,
//   gallery,
//   category: category._id,
//   regularPrice: Number(regularPrice),
//   salePrice: salePrice ? Number(salePrice) : undefined,
//   sku: sku ? sku.trim() : undefined,
//   stock: stock ? Number(stock) : 0,
//   stockStatus: stockStatus || "in_stock",
//   minOrderQty: minOrderQty ? Number(minOrderQty) : 1,
//   isFeatured: isFeatured === "true" || isFeatured === true,
//   b2bOptions: parsedB2B,
//   b2cOptions: parsedB2C,
//    attributes,   // ✅ add attributes here
// });


//       res.status(201).json(product);
//     } catch (err) {
//       console.error("Product create error:", err);
//       res.status(500).json({ message: err.message });
//     }
//   }
// );

// export const config = {
//   api: {
//     bodyParser: false, // required for multer
//   },
// };

// export default handler;



// =================================================================thisis final=========================

// // pages/api/products/index.js
// import nextConnect from "next-connect";
// import multer from "multer";
// import path from "path";
// import dbConnect from "@/lib/dbConnect";
// import Product from "@/models/Product";
// import Category from "@/models/Category";

// // Server-side only: ensure upload directory
// const uploadDir = path.join(process.cwd(), "public/uploads/products");

// // Multer storage
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

// // GET all products
// handler.get(async (req, res) => {
//   await dbConnect();
//   try {
//     const products = await Product.find().populate("category");
//     res.status(200).json(products);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // POST new product with file upload
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
//         ourSpecialization, // ✅ add this
//         importantNotes,    // ✅ add this
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
//       if (!category) return res.status(400).json({ message: "Invalid category" });

//       const mainImage = req.files?.mainImage?.[0]
//         ? `/uploads/products/${req.files.mainImage[0].filename}`
//         : "";
//       const gallery = (req.files?.gallery || []).map(
//         (f) => `/uploads/products/${f.filename}`
//       );

//       const safeParse = (str, defaultValue) => {
//         try {
//           return str ? JSON.parse(str) : defaultValue;
//         } catch {
//           return defaultValue;
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
//         ourSpecialization,   // ✅ save to DB
//         importantNotes,      // ✅ save to DB
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


















// 01-10-2025





// // pages/api/products/index.js
// import nextConnect from "next-connect";
// import multer from "multer";
// import path from "path";
// import dbConnect from "@/lib/dbConnect";
// import Product from "@/models/Product";
// import Category from "@/models/Category";

// // Server-side only: ensure upload directory
// const uploadDir = path.join(process.cwd(), "public/uploads/products");

// // Multer storage
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
//     console.error("API Error:", err);
//     res.status(500).json({ message: "Server error" });
//   },
//   onNoMatch(req, res) {
//     res.status(405).json({ message: "Method not allowed" });
//   },
// });

// // ---------------- GET all products ----------------
// handler.get(async (req, res) => {
//   await dbConnect();
//   try {
//     const products = await Product.find().populate("category");
//     res.status(200).json(products);
//   } catch (err) {
//     console.error("Fetch products error:", err);
//     res.status(500).json({ message: err.message });
//   }
// });

// // ---------------- POST new product ----------------
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
//         productFor, // ✅ add support
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
//       if (!category) {
//         return res.status(400).json({ message: "Invalid category" });
//       }

//       // Handle images
//       const mainImage = req.files?.mainImage?.[0]
//         ? `/uploads/products/${req.files.mainImage[0].filename}`
//         : "";
//       const gallery = (req.files?.gallery || []).map(
//         (f) => `/uploads/products/${f.filename}`
//       );

//       // Safe JSON parse
//       const safeParse = (str, defaultValue) => {
//         try {
//           return str ? JSON.parse(str) : defaultValue;
//         } catch {
//           return defaultValue;
//         }
//       };

//       const parsedAttributes = safeParse(attributes, []);
//       const parsedB2B = safeParse(b2bOptions, { enabled: false });
//       const parsedB2C = safeParse(b2cOptions, { enabled: true });
//       const parsedTiers = safeParse(pricingTiers, []);

//       // Add WhatsApp default link if b2c whatsapp is enabled
//       if (parsedB2C.enabled && parsedB2C.whatsappSupport) {
//         parsedB2C.whatsappLink = "https://wa.link/bizccd"; // ✅ your API link
//       }

//       // Slugify for SEO friendly URL
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
//       while (await Product.findOne({ slug })) {
//         slug = `${slug}-${suffix++}`;
//       }

//       // Create product
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
//         productFor: productFor || "both", // ✅ save
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
handler.get(async (req, res) => {
  await dbConnect();
  try {
    const { userType } = req.query; // partner / customer
    let filter = {};

    if (userType === "partner") {
      filter["b2bOptions.enabled"] = true;
    } else if (userType === "customer") {
      filter["b2cOptions.enabled"] = true;
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
