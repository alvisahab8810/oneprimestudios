// pages/category/[slug].js
// LOGIC:
//   • If the category has child subcategories → show subcategory grid (same card style as homepage)
//   • If the category is a leaf (no children) → show products grid
// B2B / B2C and partner logic fully preserved.

import React from "react";
import Link from "next/link";
import dbConnect from "@/lib/dbConnect";
import Category from "@/models/Category";
import Head from "next/head";
import Topbar from "@/components/header/Topbar";
import Offcanvas from "@/components/header/Offcanvas";
import ProductSlider from "@/components/home-page/ProductSlider";
import Footer from "@/components/footer/Footer";
import axios from "axios";

// ── serialise Mongoose doc to plain JSON ──────────────────────────────────────
function serializeDoc(doc) {
  if (!doc) return null;
  const o = { ...doc };
  if (o._id) o._id = String(o._id);
  if (o.category) o.category = String(o.category);
  if (o.parent) o.parent = String(o.parent);
  if (o.createdAt) o.createdAt = new Date(o.createdAt).toISOString();
  if (o.updatedAt) o.updatedAt = new Date(o.updatedAt).toISOString();
  return o;
}

// ── SSR ───────────────────────────────────────────────────────────────────────
export async function getServerSideProps(context) {
  const { slug } = context.params || {};
  await dbConnect();

  // 1. Find the category by slug
  const category = await Category.findOne({ slug }).lean();
  if (!category) return { notFound: true };

  // 2. Find direct children (subcategories)
  const childCategories = await Category.find({ parent: category._id })
    .sort({ name: 1 })
    .lean();

  const hasChildren = childCategories.length > 0;

  // 3. Determine userType (B2B / B2C) — same logic as before, fully preserved
  const rawUserType = context.query.userType;
  const userType =
    rawUserType === "b2b" || rawUserType === "partner" ? "b2b" : "b2c";

  const protocol = context.req.headers["x-forwarded-proto"] || "http";
  const host = context.req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  let products = [];

  if (!hasChildren) {
    // ── LEAF CATEGORY: fetch products belonging to this category ─────────────
    // We also include products from any grandchildren just in case
    const allDescendantIds = [String(category._id)];

    // fetch products via existing API (preserves B2B/B2C filtering)
    const { data: allProducts } = await axios.get(
      `${baseUrl}/api/products?userType=${userType}`,
      { headers: { cookie: context.req.headers.cookie || "" } }
    );

    products = allProducts.filter((p) =>
      allDescendantIds.includes(String(p.category?._id || p.category))
    );
  }

  return {
    props: {
      category: serializeDoc(category),
      // If parent → pass subcategory cards; if leaf → empty array
      subCategories: hasChildren
        ? childCategories.map(serializeDoc)
        : [],
      // If leaf → pass products; if parent → empty array
      products: products.map(serializeDoc),
      hasChildren,
      userType, // pass down so client Links preserve it
    },
  };
}

// ── Page component ────────────────────────────────────────────────────────────
export default function CategoryPage({
  category,
  subCategories,
  products,
  hasChildren,
  userType,
}) {
  // Build href for a subcategory link (preserves userType)
  const subHref = (sub) => ({
    pathname: `/category/${sub.slug}`,
    query: { userType },
  });

  return (
    <>
      <Head>
        <title>
          {category?.name ? `${category.name} — OnePrimeStudios` : "Category"}
        </title>
        <meta
          name="description"
          content={`Products for category ${category?.name || ""}`}
        />
      </Head>

      <Topbar />
      <Offcanvas />

      <div className="container py-5">
        {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <Link href="/products">All Categories</Link>
            </li>
            {category?.parent && (
              // If this is a sub-category, we don't have parent slug easily in SSR
              // so we just show "Categories" link above. You can extend this if needed.
              <li className="breadcrumb-item">
                <span className="text-muted">Parent</span>
              </li>
            )}
            <li className="breadcrumb-item active" aria-current="page">
              {category?.name}
            </li>
          </ol>
        </nav>

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 mb-0">{category?.name}</h1>
          <Link href="/products" className="btn btn-outline-primary btn-sm">
            ← Back to Categories
          </Link>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CASE A: This is a PARENT category → show subcategory cards
        ══════════════════════════════════════════════════════════════════ */}
        {hasChildren && (
          <>
            <p className="text-muted mb-4">
              Choose a subcategory to browse products.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "20px",
              }}
              className="mobile-products-row"
            >
              {subCategories.map((sub) => (
                <Link
                  key={sub._id}
                  href={subHref(sub)}
                  className="categories-wise-products"
                >
                  {/* Subcategory Image */}
                  <div
                    style={{
                      width: "100%",
                      height: "260px",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={sub.image || "/placeholder.png"}
                      alt={sub.name}
                      className="products-img"
                    />
                  </div>

                  {/* Subcategory Info */}
                  <div className="category-info">
                    <h5 style={{ margin: 0 }}>{sub.name}</h5>
                    <span>View All →</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            CASE B: This is a LEAF category → show products
        ══════════════════════════════════════════════════════════════════ */}
        {!hasChildren && (
          <>
            <div className="mb-4 d-flex gap-3 align-items-center">
              <div>
                <strong>{products.length}</strong> product
                {products.length !== 1 ? "s" : ""} found
              </div>
            </div>

            <div className="row g-3">
              {products.length === 0 && (
                <div className="col-12">
                  <div className="alert alert-info mb-0">
                    No products found in this category yet.
                  </div>
                </div>
              )}

              {products.map((p) => (
                <div key={p._id} className="col-6 col-md-4 col-lg-3">
                  <Link
                    className="products-image-card"
                    href={`/products/${p.slug}`}
                    style={{
                      display: "block",
                      borderRadius: "10px",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <img
                      src={p.mainImage || "/placeholder.png"}
                      alt={p.name || "Product Image"}
                      style={{
                        width: "100%",
                        height: "313px",
                        objectFit: "cover",
                        borderRadius: "15px",
                      }}
                    />
                    <h6 style={{ marginTop: "10px" }}>{p.name}</h6>
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ProductSlider />
      <Footer />
    </>
  );
}




// // pages/category/[slug].js
// import React from "react";
// import Link from "next/link";
// import dbConnect from "@/lib/dbConnect";
// import Category from "@/models/Category";
// import Head from "next/head";
// import Topbar from "@/components/header/Topbar";
// import Offcanvas from "@/components/header/Offcanvas";
// import ProductSlider from "@/components/home-page/ProductSlider";
// import Footer from "@/components/footer/Footer";
// import axios from "axios";
// // import Product from "@/models/Product";


// function serializeDoc(doc) {
//   if (!doc) return null;

//   const o = { ...doc };

//   // convert _id
//   if (o._id) o._id = String(o._id);

//   // convert category ObjectId → string
//   if (o.category) o.category = String(o.category);

//   // convert timestamps
//   if (o.createdAt) o.createdAt = new Date(o.createdAt).toISOString();
//   if (o.updatedAt) o.updatedAt = new Date(o.updatedAt).toISOString();

//   return o;
// }

// export async function getServerSideProps(context) {
//   const { slug } = context.params || {};

//   await dbConnect();

//   // find category by slug
//   const category = await Category.findOne({ slug }).lean();

//   if (!category) {
//     return { notFound: true };
//   }

//   // also include direct child categories (so the category page shows products of children too)
//   const childCats = await Category.find({ parent: category._id })
//     .select("_id")
//     .lean();
//   const catIds = [String(category._id), ...childCats.map((c) => String(c._id))];

//   // fetch products that belong to these categories
//   // NOTE: adjust the product query if your product schema uses a different field name for category
//   //   const products = await Product.find({ categoryId: { $in: catIds } })

//   // STEP 1: detect userType (SSR-safe)


  


//   const rawUserType = context.query.userType;

// const userType =
//   rawUserType === "b2b" || rawUserType === "partner"
//     ? "b2b"
//     : "b2c";



//   // const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

//   const protocol =
//   context.req.headers["x-forwarded-proto"] || "http";
// const host = context.req.headers.host;
// const baseUrl = `${protocol}://${host}`;


//   // Call same API as Products page
//   const { data: allProducts } = await axios.get(
//     `${baseUrl}/api/products?userType=${userType}`,
//     {
//       headers: {
//         cookie: context.req.headers.cookie || "",
//       },
//     }
//   );


//   const products = allProducts.filter((p) =>
//   catIds.includes(String(p.category?._id || p.category))
// );


//   const serializedCategory = serializeDoc(category);
//   const serializedProducts = products.map(serializeDoc);

//   return {
//     props: {
//       category: serializedCategory,
//       products: serializedProducts,
//     },
//   };
// }

// export default function CategoryPage({ category, products }) {
//   return (
//     <>
//       <Head>
//         <title>
//           {category?.name ? `${category.name} — Products` : "Category"}
//         </title>
//         <meta
//           name="description"
//           content={
//             category?.description ||
//             `Products for category ${category?.name || ""}`
//           }
//         />
//       </Head>

//       <Topbar />
//       <Offcanvas />

//       <div className="container py-5">
//         <div className="d-flex justify-content-between align-items-center mb-4">
//           <div>
//             <h1 className="h3 mb-0">{category?.name}</h1>
//             {category?.parent && (
//               <small className="text-muted">
//                 Parent category ID: {String(category.parent)}
//               </small>
//             )}
//           </div>

//           <div>
//             <Link href="/" className="btn btn-outline-primary">
//               Back to categories
//             </Link>
//           </div>
//         </div>

//         {/* Optional description if you have one */}
//         {category?.description && (
//           <div className="mb-4">
//             <div
//               className="category-description"
//               dangerouslySetInnerHTML={{ __html: category.description }}
//             />
//           </div>
//         )}

//         {/* Filters row (simple) */}
//         <div className="mb-4 d-flex gap-3 align-items-center">
//           <div>
//             <strong>{products.length}</strong> product
//             {products.length !== 1 ? "s" : ""} found
//           </div>
//           {/* Add more UI filters here if you want */}
//         </div>

//         {/* Product Grid */}
//         <div className="row g-3">
//           {products.length === 0 && (
//             <div className="col-12">
//               <div className="alert alert-info mb-0">
//                 No products found in this category.
//               </div>
//             </div>
//           )}

//           {products.map((p) => (
//             <div key={p._id} className="col-6 col-md-4 col-lg-3">
//               <div className="h-100">
//                 {/* <Link href={`/product/${p._id}`} className="text-decoration-none text-dark"> */}
//                 <Link
//                   className="products-image-card"
//                   href={`/products/${p.slug}`}
//                   style={{
//                     display: "block",
//                     borderRadius: "10px",
//                     textDecoration: "none",
//                     color: "inherit",
//                   }}
//                 >
//                   <img
//                     src={p.mainImage || "/placeholder.png"}
//                     alt={p.name || "Product Image"}
//                     style={{
//                       width: "100%",
//                       height: "313px",
//                       objectFit: "cover",
//                       borderRadius: "15px",
//                     }}
//                   />
//                   <h6 style={{ marginTop: "10px" }}>{p.name}</h6>
//                 </Link>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>

//       <ProductSlider />

//       <Footer />

//       <style jsx>{`
//         .category-description :global(p) {
//           margin-bottom: 0.5rem;
//         }
//       `}</style>
//     </>
//   );
// }
