// // pages/api/products/[id].js
// import dbConnect from "@/lib/dbConnect";
// import Product from "@/models/Product";
// import nextConnect from "next-connect";
// import fs from "fs";
// import path from "path";

// const handler = nextConnect();

// handler.get(async (req, res) => {
//   await dbConnect();
//   const { id } = req.query;
//   try {
//     const product = await Product.findById(id).populate("category");
//     if (!product) return res.status(404).json({ message: "Not found" });
//     res.status(200).json(product);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // update product (JSON body)
// handler.put(async (req, res) => {
//   await dbConnect();
//   const { id } = req.query;
//   try {
//     const updated = await Product.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
//     res.status(200).json(updated);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });

// handler.delete(async (req, res) => {
//   await dbConnect();
//   const { id } = req.query;
//   try {
//     await Product.findByIdAndDelete(id);
//     res.status(200).json({ message: "Deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// export default handler;




// pages/api/products/[id].js
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import nextConnect from "next-connect";

const handler = nextConnect();

// Get single product
handler.get(async (req, res) => {
  await dbConnect();
  const { id } = req.query;
  try {
    const product = await Product.findById(id).populate("category");
    if (!product) return res.status(404).json({ message: "Not found" });

    res.status(200).json({
      ...product._doc,
      ourSpecialization: product.ourSpecialization || "",
      importantNotes: product.importantNotes || "",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update product
handler.put(async (req, res) => {
  await dbConnect();
  const { id } = req.query;
  try {
    const updated = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      ...updated._doc,
      ourSpecialization: updated.ourSpecialization || "",
      importantNotes: updated.importantNotes || "",
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete product
handler.delete(async (req, res) => {
  await dbConnect();
  const { id } = req.query;
  try {
    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default handler;

