"use client";

// Homepage "Print On Demand" grid — real published products (dummy nahi).
// Data: /api/products (wahi B2B/B2C filtering jo baaki homepage use karta hai).

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { toast } from "react-hot-toast";

const MAX_ITEMS = 6;

export default function PrintOnDemand() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

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

    const userType = localStorage.getItem("userType") || "customer";
    axios
      .get(`/api/products?userType=${userType}`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        // Featured pehle, phir baaki — taki admin order control kar sake
        const sorted = [...list].sort(
          (a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured)
        );
        setProducts(sorted.slice(0, MAX_ITEMS));
      })
      .catch((err) => console.error("Error fetching products:", err))
      .finally(() => setLoading(false));
  }, []);

  const toggleWishlist = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();

    const isInWishlist = wishlist.includes(productId);
    try {
      const token = localStorage.getItem("token");
      token
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

      toast.success(isInWishlist ? "Removed from wishlist 💔" : "Added to wishlist ❤️");
      await loadWishlist();
    } catch (err) {
      if (err.response?.status === 401)
        toast.error("Please login to manage wishlist");
      else toast.error("Failed to update wishlist");
    }
  };

  const handleAddToCart = async (product, e) => {
    e.preventDefault();
    e.stopPropagation();

    // Jis product me attributes/options hain uske liye seedha cart me daalna
    // galat price bana dega — usse product page pe bhej rahe hain.
    const needsOptions =
      (product.attributes && product.attributes.length > 0) ||
      (product.pricingTiers && product.pricingTiers.length > 0);

    if (needsOptions) {
      router.push(`/products/${product.slug}`);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to add items to cart");
      router.push("/login");
      return;
    }

    const quantity = product.minOrderQty || 1;
    const unitPrice = Number(product.salePrice ?? product.basePrice ?? 0);

    try {
      setAddingId(product._id);
      await axios.post(
        "/api/cart",
        {
          productId: product._id,
          quantity,
          price: unitPrice * quantity,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Added to cart 🛒");
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Please login to add items to cart");
        router.push("/login");
      } else {
        toast.error("Failed to add to cart");
      }
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return (
      <section className="pod-section">
        <div className="container">
          <h2 className="section-heading">
            <span>Print</span> On Demand
          </h2>
          <div className="pod-grid">
            {Array.from({ length: MAX_ITEMS }).map((_, i) => (
              <div className="pod-card pod-skeleton" key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!products.length) return null;

  return (
    <section className="pod-section">
      <div className="container">
        <h2 className="section-heading">
          <span>Print</span> On Demand
        </h2>
        <p className="section-desc">
          Custom merchandise and business materials, delivered with precision.
        </p>

        <div className="pod-grid">
          {products.map((product) => {
            const price = product.salePrice ?? product.basePrice ?? 0;
            const inWishlist = wishlist.includes(product._id);

            return (
              <Link
                href={`/products/${product.slug}`}
                className="pod-card"
                key={product._id}
              >
                <img
                  className="pod-img"
                  src={product.mainImage || "/assets/images/products/placeholder.png"}
                  alt={product.name}
                  loading="lazy"
                />

                <button
                  type="button"
                  className="pod-wishlist"
                  aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                  onClick={(e) => toggleWishlist(product._id, e)}
                >
                  {inWishlist ? (
                    <FaHeart color="#E10600" size={16} />
                  ) : (
                    <FaRegHeart color="#333" size={16} />
                  )}
                </button>

                <div className="pod-overlay">
                  <h3 className="pod-title">{product.name}</h3>
                  <div className="pod-bottom">
                    <span className="pod-price">₹ {price}</span>
                    <button
                      type="button"
                      className="pod-cart-btn"
                      disabled={addingId === product._id}
                      onClick={(e) => handleAddToCart(product, e)}
                    >
                      {addingId === product._id ? "Adding..." : "Add to Cart"}
                      <span className="pod-cart-arrow" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
