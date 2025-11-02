import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import DealBanner from "@/components/home-page/Cta";
import ProductSlider from "@/components/home-page/ProductSlider";
import GoogleReviews from "@/components/home-page/GoogleReviews";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { toast } from "react-hot-toast"; // or "sonner" — whichever you finalized

export default function Products() {
  const [products, setProducts] = useState([]);

  const [wishlist, setWishlist] = useState([]);
  const authHeaders = () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  };

  const loadWishlist = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = token
        ? await axios.get("/api/wishlist", {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await axios.get("/api/wishlist", { withCredentials: true });

      setWishlist(res.data.items?.map((i) => i._id) || []);
    } catch (err) {
      setWishlist([]);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);
  const toggleWishlist = async (productId, e) => {
    e.preventDefault();
    const isInWishlist = wishlist.includes(productId); // check current state
    try {
      const token = localStorage.getItem("token");
      const res = token
        ? await axios.post(
            "/api/wishlist",
            { productId },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        : await axios.post(
            "/api/wishlist",
            { productId },
            { withCredentials: true }
          );

      if (isInWishlist) toast.success("Removed from wishlist 💔");
      else toast.success("Added to wishlist ❤️");

      await loadWishlist();
    } catch (err) {
      if (err.response?.status === 401)
        toast.error("Please login to manage wishlist");
      else toast.error("Failed to update wishlist");
    }
  };

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
              <div
                key={product._id}
                style={{
                  position: "relative",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                {/* ❤️ Wishlist button */}
                <div
                  onClick={(e) => toggleWishlist(product._id, e)}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    zIndex: 10,
                    background: "#fff",
                    borderRadius: "50%",
                    padding: "6px",
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                    display : "flex"
                  }}
                >
                  {wishlist.includes(product._id) ? (
                    <FaHeart color="red" size={20} />
                  ) : (
                    <FaRegHeart color="gray" size={20} />
                  )}
                </div>

                {/* 🛒 Product Card */}
                <Link
                  href={`/products/${product.slug}`}
                  style={{
                    display: "block",
                    borderRadius: "10px",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <img
                    src={product.mainImage || "/placeholder.png"}
                    alt={product.name || "Product Image"}
                    style={{
                      width: "100%",
                      height: "313px",
                      objectFit: "cover",
                      borderRadius: "15px",
                    }}
                  />
                  <h6 style={{ marginTop: "10px" }}>{product.name}</h6>
                </Link>
              </div>
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
