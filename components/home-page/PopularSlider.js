"use client";
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import Link from "next/link";
import "swiper/css";
import axios from "axios";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { toast } from "react-hot-toast";

export default function PopularSlider() {
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } catch {
      setWishlist([]);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  useEffect(() => {
    const userType = localStorage.getItem("userType") || "customer";
    axios
      .get(`/api/products?userType=${userType}&popular=true`)
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("Error fetching popular products:", err))
      .finally(() => setLoading(false));
  }, []);

  const toggleWishlist = async (productId, e) => {
    e.preventDefault();
    const isInWishlist = wishlist.includes(productId);
    try {
      const token = localStorage.getItem("token");
      const res = token
        ? await axios.post(
            "/api/wishlist",
            { productId },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        : await axios.post("/api/wishlist", { productId }, { withCredentials: true });

      if (isInWishlist) toast.success("Removed from wishlist 💔");
      else toast.success("Added to wishlist ❤️");

      await loadWishlist();
    } catch (err) {
      if (err.response?.status === 401)
        toast.error("Please login to manage wishlist");
      else toast.error("Failed to update wishlist");
    }
  };

  if (loading) {
    return (
      <div className="product-slider text-center my-5">
        <h2>Popular Products</h2>
        <div className="spinner-border text-primary mt-3" role="status" />
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <>
      <div className="container mobile-none">
        <div className="categories-header">
          <h3 className="categories-title">Popular Products</h3>
        </div>
        <div className="underline"></div>
      </div>

      <div className="product-slider">
        <div className="desktop-none">
          <div className="categories-header mobile-products">
            <h3 className="categories-title">Popular Products</h3>
            <Link href="/products" className="view-all-link">
              View All <img src="/assets/images/icons/arrow.svg" />
            </Link>
          </div>
        </div>

        <Swiper
          modules={[Navigation]}
          spaceBetween={20}
          grabCursor
          slidesPerView={4.3}
          breakpoints={{
            320: { slidesPerView: 2, spaceBetween: 10 },
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 4.3 },
          }}
        >
          {products.map((product) => (
            <SwiperSlide key={product._id}>
              <Link href={`/products/${product.slug}`} passHref>
                <div className="product-card cursor-pointer position-relative">
                  <div
                    className="wishlist-btn position-absolute top-0 end-0 m-2"
                    onClick={(e) => toggleWishlist(product._id, e)}
                  >
                    {wishlist.includes(product._id) ? (
                      <FaHeart color="red" size={20} />
                    ) : (
                      <FaRegHeart color="gray" size={20} />
                    )}
                  </div>
                  <div className="price-tag">
                    {product.salePrice
                      ? `₹${product.salePrice}`
                      : `₹${product.basePrice}`}
                  </div>
                  <img
                    src={
                      product.mainImage ||
                      "/assets/images/products/placeholder.png"
                    }
                    alt={product.name}
                  />
                  <div className="title">{product.name}</div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>

        <style jsx>{`
          .wishlist-btn {
            background: #fff;
            border-radius: 50%;
            padding: 5px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
          }
        `}</style>
      </div>
    </>
  );
}
