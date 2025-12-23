// pages/category/[slug].js
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

function serializeDoc(doc) {
  if (!doc) return null;

  const o = { ...doc };

  // convert _id
  if (o._id) o._id = String(o._id);

  // convert category ObjectId → string
  if (o.category) o.category = String(o.category);

  // convert timestamps
  if (o.createdAt) o.createdAt = new Date(o.createdAt).toISOString();
  if (o.updatedAt) o.updatedAt = new Date(o.updatedAt).toISOString();

  return o;
}

export async function getServerSideProps(context) {
  const { slug } = context.params || {};

  await dbConnect();

  // find category by slug
  const category = await Category.findOne({ slug }).lean();

  if (!category) {
    return { notFound: true };
  }

  // also include direct child categories (so the category page shows products of children too)
  const childCats = await Category.find({ parent: category._id })
    .select("_id")
    .lean();
  const catIds = [String(category._id), ...childCats.map((c) => String(c._id))];

  // fetch products that belong to these categories
  // NOTE: adjust the product query if your product schema uses a different field name for category
  //   const products = await Product.find({ categoryId: { $in: catIds } })

  // STEP 1: detect userType (SSR-safe)


  


  const rawUserType = context.query.userType;

const userType =
  rawUserType === "b2b" || rawUserType === "partner"
    ? "b2b"
    : "b2c";



  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Call same API as Products page
  const { data: allProducts } = await axios.get(
    `${baseUrl}/api/products?userType=${userType}`,
    {
      headers: {
        cookie: context.req.headers.cookie || "",
      },
    }
  );


  const products = allProducts.filter((p) =>
  catIds.includes(String(p.category?._id || p.category))
);


  const serializedCategory = serializeDoc(category);
  const serializedProducts = products.map(serializeDoc);

  return {
    props: {
      category: serializedCategory,
      products: serializedProducts,
    },
  };
}

export default function CategoryPage({ category, products }) {
  return (
    <>
      <Head>
        <title>
          {category?.name ? `${category.name} — Products` : "Category"}
        </title>
        <meta
          name="description"
          content={
            category?.description ||
            `Products for category ${category?.name || ""}`
          }
        />
      </Head>

      <Topbar />
      <Offcanvas />

      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 mb-0">{category?.name}</h1>
            {category?.parent && (
              <small className="text-muted">
                Parent category ID: {String(category.parent)}
              </small>
            )}
          </div>

          <div>
            <Link href="/" className="btn btn-outline-primary">
              Back to categories
            </Link>
          </div>
        </div>

        {/* Optional description if you have one */}
        {category?.description && (
          <div className="mb-4">
            <div
              className="category-description"
              dangerouslySetInnerHTML={{ __html: category.description }}
            />
          </div>
        )}

        {/* Filters row (simple) */}
        <div className="mb-4 d-flex gap-3 align-items-center">
          <div>
            <strong>{products.length}</strong> product
            {products.length !== 1 ? "s" : ""} found
          </div>
          {/* Add more UI filters here if you want */}
        </div>

        {/* Product Grid */}
        <div className="row g-3">
          {products.length === 0 && (
            <div className="col-12">
              <div className="alert alert-info mb-0">
                No products found in this category.
              </div>
            </div>
          )}

          {products.map((p) => (
            <div key={p._id} className="col-6 col-md-4 col-lg-3">
              <div className="h-100">
                {/* <Link href={`/product/${p._id}`} className="text-decoration-none text-dark"> */}
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
            </div>
          ))}
        </div>
      </div>

      <ProductSlider />

      <Footer />

      <style jsx>{`
        .category-description :global(p) {
          margin-bottom: 0.5rem;
        }
      `}</style>
    </>
  );
}
