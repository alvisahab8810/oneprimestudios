// import { useEffect, useState } from "react";
// import Link from "next/link";
// import { FaHeart } from "react-icons/fa";
// import { toast } from "sonner";

// export default function WishlistPage() {
//   const [items, setItems] = useState([]);

//   useEffect(() => {
//     const wishlistIds = JSON.parse(localStorage.getItem("wishlist")) || [];
//     if (wishlistIds.length === 0) return;
//     fetch(`/api/products/byIds?ids=${wishlistIds.join(",")}`)
//       .then((res) => res.json())
//       .then((data) => setItems(data))
//       .catch(() => toast.error("Failed to load wishlist"));
//   }, []);

//   const removeFromWishlist = (id) => {
//     const updated = items.filter((p) => p._id !== id);
//     setItems(updated);
//     localStorage.setItem("wishlist", JSON.stringify(updated.map((p) => p._id)));
//     toast.success("Removed from wishlist ❤️");
//   };

//   // ✅ FIXED: Matches your working cart structure
//   const moveToBag = (product) => {
//     const cart = JSON.parse(localStorage.getItem("cartItems")) || [];

//     const existingIndex = cart.findIndex(
//       (item) => item.product._id === product._id
//     );

//     if (existingIndex > -1) {
//       cart[existingIndex].quantity += product.minOrderQty || 1;
//     } else {
//       cart.push({
//         product: {
//           _id: product._id,
//           name: product.name,
//           mainImage: product.mainImage,
//           basePrice: product.basePrice,
//           salePrice: product.salePrice,
//           slug: product.slug,
//           minOrderQty: product.minOrderQty,
//         },
//         quantity: product.minOrderQty || 1,
//       });
//     }

//     localStorage.setItem("cartItems", JSON.stringify(cart));
//     toast.success("Moved to Bag 🛒");

//     // Remove from wishlist after adding
//     removeFromWishlist(product._id);
//   };

//   if (!items.length)
//     return (
//       <div className="container text-center py-5">
//         <h3>Your wishlist is empty ❤️</h3>
//         <Link href="/products" className="btn btn-primary mt-3">
//           Browse Products
//         </Link>
//       </div>
//     );

//   return (
//     <div className="container py-5">
//       <h3 className="mb-4">My Wishlist ❤️</h3>
//       <div className="row">
//         {items.map((p) => (
//           <div className="col-md-3 col-6 mb-4" key={p._id}>
//             <div className="wishlist-card position-relative shadow-sm border rounded-4 overflow-hidden">
//               {/* Remove button */}
//               <button
//                 className="wishlist-remove-btn position-absolute top-0 end-0 m-2 btn btn-light rounded-circle p-2"
//                 onClick={() => removeFromWishlist(p._id)}
//               >
//                 <FaHeart color="red" size={18} />
//               </button>

//               {/* Product image */}
//               <Link href={`/products/${p.slug}`}>
//                 <img
//                   src={p.mainImage || "/assets/images/products/placeholder.png"}
//                   alt={p.name}
//                   className="w-100"
//                   style={{
//                     height: "220px",
//                     objectFit: "cover",
//                     borderBottom: "1px solid #eee",
//                   }}
//                 />
//               </Link>

//               <div className="text-center p-3">
//                 <h6 className="fw-semibold mb-2">{p.name}</h6>
//                 <button
//                   onClick={() => moveToBag(p)}
//                   className="btn btn-primary rounded-pill px-4 py-2"
//                 >
//                   Move to Bag
//                 </button>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       <style jsx>{`
//         .wishlist-card {
//           transition: all 0.3s ease;
//           background: #fff;
//         }
//         .wishlist-card:hover {
//           transform: translateY(-5px);
//           box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
//         }
//         .wishlist-remove-btn {
//           background: white !important;
//           border: none;
//           box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
//         }
//         .wishlist-remove-btn:hover {
//           transform: scale(1.1);
//         }
//       `}</style>
//     </div>
//   );
// }

// pages/wishlist.js
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FaHeart } from "react-icons/fa";
import { toast } from "react-hot-toast"; // or "sonner" — whichever you finalized

import axios from "axios";
import { useRouter } from "next/navigation";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const router = useRouter();

  const loadWishlist = async () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      let res;
      if (token)
        res = await axios.get("/api/wishlist", {
          headers: { Authorization: `Bearer ${token}` },
        });
      else res = await axios.get("/api/wishlist", { withCredentials: true });
      setItems(res.data.items || []);
    } catch (err) {
      setItems([]);
      // don't spam toasts on page load; show when action fails
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const removeFromWishlist = async (productId) => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      // 🟢 Optimistically remove from UI first
      setItems((prev) =>
        prev.filter((it) => String(it._id) !== String(productId))
      );

      // 🟡 Then call API in background
      if (token) {
        await axios.post(
          "/api/wishlist",
          { productId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          "/api/wishlist",
          { productId },
          { withCredentials: true }
        );
      }

      toast.success("Removed from wishlist ❤️");
    } catch (err) {
      toast.error("Error removing from wishlist");
      console.error(err);
      // 🛑 Optional: revert UI if API failed
      loadWishlist();
    }
  };

  // const removeFromWishlist = async (productId) => {
  //   try {
  //     const token =
  //       typeof window !== "undefined" ? localStorage.getItem("token") : null;
  //     let res;
  //     if (token)
  //       res = await axios.post(
  //         "/api/wishlist",
  //         { productId },
  //         { headers: { Authorization: `Bearer ${token}` } }
  //       );
  //     else
  //       res = await axios.post(
  //         "/api/wishlist",
  //         { productId },
  //         { withCredentials: true }
  //       );

  //     setItems(res.data.items || []);
  //     toast.success("Removed from wishlist ❤️");
  //   } catch (err) {
  //     toast.error("Error removing from wishlist");
  //     console.error(err);
  //   }
  // };

  const moveToBag = async (product) => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      // 1) Add to cart
      let cartRes;
      if (token) {
        cartRes = await axios.post(
          "/api/cart",
          { productId: product._id, quantity: 1 },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        cartRes = await axios.post(
          "/api/cart",
          { productId: product._id, quantity: 1 },
          { withCredentials: true }
        );
      }

      // 2) Remove from wishlist in backend & update UI immediately
      if (token) {
        await axios.post(
          "/api/wishlist",
          { productId: product._id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          "/api/wishlist",
          { productId: product._id },
          { withCredentials: true }
        );
      }

      setItems((prev) =>
        prev.filter((it) => String(it._id) !== String(product._id))
      );
      toast.success("Moved to bag 🛒");

      // 3) redirect to cart
      setTimeout(() => router.push("/cart"), 300);
    } catch (err) {
      if (err.response?.status === 401)
        toast.error("Please login to move items to cart");
      else toast.error("Failed to move to bag");
      console.error(err);
    }
  };

  if (!items.length)
    return (
      <div>
        <div className="container">
          <Topbar />
        </div>

        <div className="container text-center py-5">
          <h3>Your wishlist is empty ❤️</h3>
          <Link href="/products" className="btn btn-primary mt-3">
            Browse Products
          </Link>
        </div>

        <Footer />
      </div>
    );

  return (
    <div>
      <div className="container">
        <Topbar />
      </div>

      <div className="container py-5">
        <h3 className="mb-4">My Wishlist ❤️</h3>
        <div className="row">
          {items.map((p) => (
            <div className="col-md-3 col-6 mb-4" key={p._id}>
              <div className="wishlist-card position-relative shadow-sm border rounded-4 overflow-hidden">
                <button
                  className="wishlist-remove-btn position-absolute top-0 end-0 m-2 btn btn-light rounded-circle p-2 d-flex bg-none"
                  onClick={() => removeFromWishlist(p._id)}
                >
                  {/* <FaHeart color="red" size={18} /> */}
                  <img src="/assets/images/icons/cross.svg"></img>
                </button>

                <Link href={`/products/${p.slug}`}>
                  <img
                    src={
                      p.mainImage || "/assets/images/products/placeholder.png"
                    }
                    alt={p.name}
                    className="w-100"
                    style={{
                      height: "220px",
                      objectFit: "cover",
                      borderBottom: "1px solid #eee",
                    }}
                  />
                </Link>

                <div className="text-center p-3">
                  <h6 className="fw-semibold mb-2">{p.name}</h6>
                  <button
                    onClick={() => moveToBag(p)}
                    className="btn btn-primary rounded-pill px-4 py-2"
                  >
                    Move to Bag
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
