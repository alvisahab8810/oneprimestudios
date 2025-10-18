
import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import DealBanner from "@/components/home-page/Cta";
import ProductSlider from "@/components/home-page/ProductSlider";
import GoogleReviews from "@/components/home-page/GoogleReviews";

export default function Products() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const userType = localStorage.getItem("userType");
    let url = "/api/products";
    if (userType) url += `?userType=${userType}`;

    axios.get(url).then((res) => setProducts(res.data));
  }, []);

  return (
    <>
      <div className="container mb-5">
        <Topbar />

        <div style={{ padding: "20px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "15px",
            }}
          >
            {products.map((product) => (
              <Link
                key={product?._id}
                href={`/products/${product?.slug}`} // ✅ changed from _id to slug
                style={{
                  display: "block",
                  borderRadius: "10px",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "0.3s",
                }}
              >
                <img
                  src={product?.mainImage || "/placeholder.png"}
                  alt={product?.name || "Product Image"}
                  style={{
                    width: "100%",
                    height: "313px",
                    objectFit: "cover",
                    borderRadius: "15px",
                  }}
                />
                <h6 style={{ marginTop: "10px" }}>
                  {product?.name || "Unnamed Product"}
                </h6>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <GoogleReviews />
      <ProductSlider />
      <div className="container mb-5">
        <DealBanner />
      </div>
      <Footer />
    </>
  );
}
