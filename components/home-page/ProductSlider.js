

// "use client";
// import { useEffect, useState } from "react";
// import { Swiper, SwiperSlide } from "swiper/react";
// import { Navigation } from "swiper/modules";
// import Link from "next/link";
// import "swiper/css";
// import axios from "axios";
// import { FaHeart, FaRegHeart } from "react-icons/fa";
// import { toast } from "sonner";

// export default function ProductSlider() {
//   const [products, setProducts] = useState([]);
//   const [wishlist, setWishlist] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // ✅ Fetch wishlist dynamically
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return;
//     axios
//       .get("/api/wishlist", {
//         headers: { Authorization: `Bearer ${token}` },
//       })
//       .then((res) => {
//         setWishlist(res.data.items?.map((item) => item._id) || []);
//       })
//       .catch(() => console.warn("No wishlist found"));
//   }, []);

//   // ✅ Fetch products
//   useEffect(() => {
//     const savedUserType = localStorage.getItem("userType");
//     let url = "/api/products";

//     if (!savedUserType) {
//       url += "?userType=customer";
//     } else {
//       url += `?userType=${savedUserType}`;
//     }

//     axios
//       .get(url)
//       .then((res) => setProducts(res.data))
//       .catch((err) => console.error("Error fetching products:", err))
//       .finally(() => setLoading(false));
//   }, []);

//   // ✅ Handle wishlist toggle dynamically
//   const toggleWishlist = async (id, e) => {
//     e.preventDefault();
//     const token = localStorage.getItem("token");

//     if (!token) {
//       toast.error("Please login to manage wishlist");
//       return;
//     }

//     try {
//       const res = await axios.post(
//         "/api/wishlist",
//         { productId: id },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );

//       setWishlist(res.data.items);
//       if (res.data.action === "added") {
//         toast.success("Added to wishlist ❤️");
//       } else {
//         toast.success("Removed from wishlist 💔");
//       }
//     } catch (err) {
//       toast.error("Wishlist update failed");
//       console.error(err);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="product-slider text-center my-5">
//         <h2>Our Most popular Products</h2>
//         <div className="spinner-border text-primary mt-3" role="status" />
//       </div>
//     );
//   }

//   if (products.length === 0) {
//     return (
//       <div className="product-slider text-center my-5">
//         <h2>Our Most popular Products</h2>
//         <p>No products found for your account type.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="product-slider">
//       <h2>Our Most popular Products</h2>

//       <Swiper
//         modules={[Navigation]}
//         spaceBetween={20}
//         grabCursor={true}
//         slidesPerView={4.3}
//         breakpoints={{
//           320: { slidesPerView: 1 },
//           640: { slidesPerView: 2 },
//           1024: { slidesPerView: 4.3 },
//         }}
//       >
//         {products.map((product) => (
//           <SwiperSlide key={product._id}>
//             <Link href={`/products/${product.slug}`} passHref>
//               <div className="product-card cursor-pointer position-relative">
//                 {/* ❤️ Wishlist Button */}
//                 <div
//                   className="wishlist-btn position-absolute top-0 end-0 m-2"
//                   onClick={(e) => toggleWishlist(product._id, e)}
//                 >
//                   {wishlist.includes(product._id) ? (
//                     <FaHeart color="red" size={20} />
//                   ) : (
//                     <FaRegHeart color="gray" size={20} />
//                   )}
//                 </div>

//                 <div className="price-tag">
//                   {product.salePrice
//                     ? `₹${product.salePrice}`
//                     : `₹${product.basePrice}`}
//                 </div>
//                 <img
//                   src={
//                     product.mainImage ||
//                     "/assets/images/products/placeholder.png"
//                   }
//                   alt={product.name}
//                 />
//                 <div className="title">{product.name}</div>
//               </div>
//             </Link>
//           </SwiperSlide>
//         ))}
//       </Swiper>

//       <style jsx>{`
//         .wishlist-btn {
//           background: #fff;
//           border-radius: 50%;
//           padding: 5px;
//           cursor: pointer;
//           transition: all 0.2s ease;
//           box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
//           display: flex;
//           align-items: center;
//           justify-content: center;
//         }
//       `}</style>
//     </div>
//   );
// }







// components/ProductSlider.js
"use client";
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import Link from "next/link";
import "swiper/css";
import axios from "axios";
import { FaHeart, FaRegHeart } from "react-icons/fa";
// import { toast } from "sonner";
import { toast } from "react-hot-toast"; // or "sonner" — whichever you finalized


export default function ProductSlider() {
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]); // array of product _id strings
  const [loading, setLoading] = useState(true);

  // helper to get auth headers object (bearer token if present)
  const authHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  };

  const loadWishlist = async () => {
    try {
      // try with Authorization if token exists, otherwise rely on cookies (axios withCredentials)
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        const res = await axios.get("/api/wishlist", { headers: { Authorization: `Bearer ${token}` } });
        setWishlist(res.data.items?.map((i) => i._id) || []);
      } else {
        const res = await axios.get("/api/wishlist", { withCredentials: true });
        setWishlist(res.data.items?.map((i) => i._id) || []);
      }
    } catch (err) {
      // not logged in or empty wishlist — silently ignore
      setWishlist([]);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  useEffect(() => {
    const userType = localStorage.getItem("userType") || "customer";
    axios
      .get(`/api/products?userType=${userType}`)
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("Error fetching products:", err))
      .finally(() => setLoading(false));
  }, []);

  // const toggleWishlist = async (productId, e) => {
  //   e.preventDefault();
  //   try {
  //     const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  //     let res;
  //     if (token) {
  //       res = await axios.post("/api/wishlist", { productId }, { headers: { Authorization: `Bearer ${token}` } });
  //     } else {
  //       res = await axios.post("/api/wishlist", { productId }, { withCredentials: true });
  //     }

  //     // Normalize to array of ids
  //     const ids = (res.data.items || []).map((it) => it._id);
  //     setWishlist(ids);

  //     if (res.data.action === "added") toast.success("Added to wishlist ❤️");
  //     else toast.success("Removed from wishlist 💔");
  //   } catch (err) {
  //     if (err.response?.status === 401) toast.error("Please login to manage wishlist");
  //     else toast.error("Failed to update wishlist");
  //     console.error(err);
  //   }

  //     // 👇 ADD THIS LINE
  //   setTimeout(() => {
  //     window.location.reload();
  //   }, 600); // short delay so toast is visible

  // };


  const toggleWishlist = async (productId, e) => {
  e.preventDefault();
  const isInWishlist = wishlist.includes(productId); // check current state
  try {
    const token = localStorage.getItem("token");
    const res = token
      ? await axios.post("/api/wishlist", { productId }, { headers: { Authorization: `Bearer ${token}` } })
      : await axios.post("/api/wishlist", { productId }, { withCredentials: true });

    if (isInWishlist) toast.success("Removed from wishlist 💔");
    else toast.success("Added to wishlist ❤️");

    await loadWishlist();
  } catch (err) {
    if (err.response?.status === 401) toast.error("Please login to manage wishlist");
    else toast.error("Failed to update wishlist");
  }
};

  if (loading) {
    return (
      <div className="product-slider text-center my-5">
        <h2>Our Most popular Products</h2>
        <div className="spinner-border text-primary mt-3" role="status" />
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="product-slider text-center my-5">
        <h2>Our Most popular Products</h2>
        <p>No products found for your account type.</p>
      </div>
    );
  }

  return (
    <div className="product-slider">
      <h2>Our Most Popular Products</h2>
      <Swiper modules={[Navigation]} spaceBetween={20} grabCursor slidesPerView={4.3} breakpoints={{ 320: { slidesPerView: 1 }, 640: { slidesPerView: 2 }, 1024: { slidesPerView: 4.3 } }}>
        {products.map((product) => (
          <SwiperSlide key={product._id}>
            <Link href={`/products/${product.slug}`} passHref>
              <div className="product-card cursor-pointer position-relative">
                <div className="wishlist-btn position-absolute top-0 end-0 m-2" onClick={(e) => toggleWishlist(product._id, e)}>
                  {wishlist.includes(product._id) ? <FaHeart color="red" size={20} /> : <FaRegHeart color="gray" size={20} />}
                </div>

                <div className="price-tag">{product.salePrice ? `₹${product.salePrice}` : `₹${product.basePrice}`}</div>
                <img src={product.mainImage || "/assets/images/products/placeholder.png"} alt={product.name} />
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
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
          display:flex;
          align-items:center;
          justify-content:center;
        }
      `}</style>
    </div>
  );
}
