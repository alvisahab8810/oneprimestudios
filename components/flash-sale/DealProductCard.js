// components/flash-sale/DealProductCard.js
// A flash-sale product drawn with the same card as the home "Print On Demand"
// grid (pod-card): big image, dark bottom panel, name, price, Add to Cart and
// the wishlist heart. The deal price is shown with the normal price struck out.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { toast } from "react-hot-toast";

const money = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const offPercent = (regular, deal) =>
  regular > deal && regular > 0 ? Math.round(((regular - deal) / regular) * 100) : 0;

const authConfig = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { headers: { Authorization: `Bearer ${token}` } } : { withCredentials: true };
};

// Wishlist ids for a whole grid, loaded once instead of once per card
export function useWishlistIds() {
  const [ids, setIds] = useState([]);

  const reload = async () => {
    try {
      const res = await axios.get("/api/wishlist", authConfig());
      setIds(res.data.items?.map((i) => i._id) || []);
    } catch {
      setIds([]);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const toggle = async (productId) => {
    const had = ids.includes(productId);
    try {
      await axios.post("/api/wishlist", { productId }, authConfig());
      toast.success(had ? "Removed from wishlist" : "Added to wishlist");
      await reload();
    } catch (err) {
      if (err.response?.status === 401) toast.error("Please login to manage wishlist");
      else toast.error("Failed to update wishlist");
    }
  };

  return { ids, toggle };
}

export default function DealProductCard({ p, inWishlist = false, onToggleWishlist }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  const off = offPercent(p.regularPrice, p.dealPrice);

  const addToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (addingRef.current) return;

    // Options or quantity slabs change the price, so those are picked on the product page
    if (p.needsOptions) {
      router.push(`/products/${p.slug}`);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to add items to cart");
      router.push("/login");
      return;
    }

    try {
      addingRef.current = true;
      setAdding(true);
      // The server applies the live deal price itself; this is only a hint
      await axios.post(
        "/api/cart",
        { productId: p._id, quantity: p.minOrderQty || 1, price: p.dealPrice },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Added to cart");
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error("Please login to add items to cart");
        router.push("/login");
      } else {
        toast.error(err.response?.data?.message || "Failed to add to cart");
      }
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  const wish = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleWishlist) onToggleWishlist(p._id);
  };

  return (
    <Link href={`/products/${p.slug}`} className="pod-card deal-pod-card">
      <img className="pod-img" src={p.mainImage || "/assets/images/products/placeholder.png"} alt={p.name} loading="lazy" />

      <div className="deal-pod-badges">
        {off > 0 && <span className="deal-pod-off">{off}% OFF</span>}
        {p.outOfStock && <span className="badge bg-danger">Out of Stock</span>}
      </div>

      <button
        type="button"
        className="pod-wishlist"
        aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
        onClick={wish}
      >
        {inWishlist ? <FaHeart color="#E10600" size={16} /> : <FaRegHeart color="#333" size={16} />}
      </button>

      <div className="pod-overlay">
        <h3 className="pod-title">{p.name}</h3>
        <div className="pod-bottom">
          <span className="pod-price">
            ₹ {money(p.dealPrice)}
            {p.regularPrice > p.dealPrice && <s className="deal-pod-was">₹ {money(p.regularPrice)}</s>}
            {p.minOrderQty > 1 && <span className="deal-pod-moq">for {p.minOrderQty} pcs</span>}
          </span>
          <button type="button" className="pod-cart-btn" disabled={adding} onClick={addToCart}>
            {adding ? "Adding..." : "Add to Cart"}
            <span className="pod-cart-arrow" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Link>
  );
}

// Extra bits the pod card does not have: the % OFF badge and the struck-out price
export function DealCardStyles() {
  return (
    <style jsx global>{`
      .deal-pod-badges { position: absolute; top: 12px; left: 12px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; z-index: 2; }
      .deal-pod-off { background: #E10600; color: #fff; font-size: 12px; font-weight: 800; letter-spacing: 0.02em; padding: 4px 10px; border-radius: 999px; box-shadow: 0 2px 6px rgba(0,0,0,0.18); }
      .deal-pod-card .pod-price { display: inline-flex; align-items: baseline; flex-wrap: wrap; column-gap: 8px; row-gap: 0; white-space: normal; }
      .deal-pod-was { font-size: 14px; font-weight: 500; opacity: 0.7; white-space: nowrap; }
      .deal-pod-moq { flex-basis: 100%; font-size: 12px; font-weight: 500; opacity: 0.75; }
    `}</style>
  );
}
