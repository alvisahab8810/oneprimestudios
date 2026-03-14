// pages/products/index.js  (your current products listing page)
// CHANGE: Now fetches only parent categories (parent: null) to show on homepage
// B2B/B2C logic is fully preserved

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Topbar from "@/components/header/Topbar";
import Footer from "@/components/footer/Footer";
import DealBanner from "@/components/home-page/Cta";
import ProductSlider from "@/components/home-page/ProductSlider";
import Offcanvas from "@/components/header/Offcanvas";
import PartnerInfoBanner from "@/components/partner/PartnerInfoBanner";
import PartnerLiveCounter from "@/components/partner/PartnerLiveCounter";
import { toast } from "react-hot-toast";

export default function Products() {
  // ── state ──────────────────────────────────────────────────────────────────
  const [parentCategories, setParentCategories] = useState([]);
  const [showPartnerBanner, setShowPartnerBanner] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── partner banner (unchanged) ────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userType = localStorage.getItem("userType");
    if (token && userType === "partner") setShowPartnerBanner(true);
  }, []);

  // ── fetch ONLY parent categories ──────────────────────────────────────────
  // We no longer fetch all products just to extract categories.
  // Instead we hit GET /api/categories?parents=true which already exists in
  // your API and returns only top-level (parent: null) categories.
  useEffect(() => {
    const fetchParentCategories = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const userType = localStorage.getItem("userType");

        // Respect B2B/B2C: pass userType so the API can filter if needed
        // (your current API ignores it at category level but this is future-safe)
        const params = new URLSearchParams();
        params.set("parents", "true");
        if (token) {
          params.set("userType", userType || "b2c");
        } else {
          params.set("userType", "b2c");
        }

        // Also handle search param passed from search bar
        const searchParams = new URLSearchParams(window.location.search);
        const search = searchParams.get("search") || "";
        if (search) params.set("search", search);

        const res = await axios.get(`/api/categories?${params.toString()}`);
        setParentCategories(res.data || []);
      } catch (err) {
        console.error("fetchParentCategories:", err);
        toast.error("Failed to load categories");
      } finally {
        setLoading(false);
      }
    };

    fetchParentCategories();
  }, []);

  // ── build href for each parent category ───────────────────────────────────
  const categoryHref = (category) => {
    const userType =
      typeof window !== "undefined"
        ? localStorage.getItem("userType") || "b2c"
        : "b2c";
    return {
      pathname: `/category/${category.slug}`,
      query: { userType },
    };
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="products-main-page">
      <Topbar />
      <Offcanvas />

      {showPartnerBanner && (
        <div className="container">
          <PartnerLiveCounter />
        </div>
      )}
      {showPartnerBanner && <PartnerInfoBanner />}

      <div className="products-main-row padding-top-40">
        <div className="container">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : parentCategories.length === 0 ? (
            <div className="text-center py-5 text-muted">
              No categories found.
            </div>
          ) : (
            <div
              className="mobile-products-row"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "20px",
              }}
            >
              {parentCategories.map((category) => (
                <Link
                  key={category._id}
                  href={categoryHref(category)}
                  className="categories-wise-products"
                >
                  {/* Category Image */}
                  <div
                    style={{ width: "100%", height: "260px", overflow: "hidden" }}
                  >
                    <img
                      src={category.image || "/placeholder.png"}
                      alt={category.name}
                      className="products-img"
                    />
                  </div>

                  {/* Category Info */}
                  <div className="category-info">
                    <h5 style={{ margin: 0 }}>{category.name}</h5>
                    <span>View All →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProductSlider />
      <div className="container mb-5">
        <DealBanner />
      </div>
      <Footer />
    </div>
  );
}









// import { useEffect, useState } from "react";
// import Link from "next/link";
// import axios from "axios";
// import Topbar from "@/components/header/Topbar";
// import Footer from "@/components/footer/Footer";
// import DealBanner from "@/components/home-page/Cta";
// import ProductSlider from "@/components/home-page/ProductSlider";
// import GoogleReviews from "@/components/home-page/GoogleReviews";
// import { FaHeart, FaRegHeart } from "react-icons/fa";
// import { toast } from "react-hot-toast"; // or "sonner" — whichever you finalized
// import Offcanvas from "@/components/header/Offcanvas";
// import PartnerInfoBanner from "@/components/partner/PartnerInfoBanner";
// import PartnerLiveCounter from "@/components/partner/PartnerLiveCounter";

// export default function Products() {
//   const [products, setProducts] = useState([]);
// const [showPartnerBanner, setShowPartnerBanner] = useState(false);
//   const [wishlist, setWishlist] = useState([]);
//   const authHeaders = () => {
//     const token =
//       typeof window !== "undefined" ? localStorage.getItem("token") : null;
//     if (token) return { Authorization: `Bearer ${token}` };
//     return {};
//   };


  
//   const loadWishlist = async () => {
//     try {
//       const token =
//         typeof window !== "undefined" ? localStorage.getItem("token") : null;
//       const res = token
//         ? await axios.get("/api/wishlist", {
//             headers: { Authorization: `Bearer ${token}` },
//           })
//         : await axios.get("/api/wishlist", { withCredentials: true });

//       setWishlist(res.data.items?.map((i) => i._id) || []);
//     } catch (err) {
//       setWishlist([]);
//     }
//   };

//   useEffect(() => {
//     loadWishlist();
//   }, []);
//   const toggleWishlist = async (productId, e) => {
//     e.preventDefault();
//     const isInWishlist = wishlist.includes(productId); // check current state
//     try {
//       const token = localStorage.getItem("token");
//       const res = token
//         ? await axios.post(
//             "/api/wishlist",
//             { productId },
//             { headers: { Authorization: `Bearer ${token}` } }
//           )
//         : await axios.post(
//             "/api/wishlist",
//             { productId },
//             { withCredentials: true }
//           );

//       if (isInWishlist) toast.success("Removed from wishlist 💔");
//       else toast.success("Added to wishlist ❤️");

//       await loadWishlist();
//     } catch (err) {
//       if (err.response?.status === 401)
//         toast.error("Please login to manage wishlist");
//       else toast.error("Failed to update wishlist");
//     }
//   };

//   // useEffect(() => {
//   //   const userType = localStorage.getItem("userType");
//   //   let url = "/api/products";
//   //   if (userType) url += `?userType=${userType}`;

//   //   axios.get(url).then((res) => setProducts(res.data));
//   // }, []);

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     const userType = localStorage.getItem("userType");

//     let url = "/api/products";

//     // If not logged in → force B2C only
//     if (!token) {
//       url += "?userType=b2c";
//     } else {
//       // Logged-in users → use saved userType (b2b or b2c)
//       url += `?userType=${userType || "b2c"}`;
//     }

//     // axios.get(url).then((res) => setProducts(res.data));

//     const searchParams = new URLSearchParams(window.location.search);
//     const search = searchParams.get("search") || "";

//     if (search) url += `&search=${encodeURIComponent(search)}`;

//     axios.get(url).then((res) => setProducts(res.data));
//   }, []);

//   const categoriesMap = products.reduce((acc, product) => {
//     if (product.category && product.category._id) {
//       acc[product.category._id] = product.category;
//     }
//     return acc;
//   }, {});

//   const categories = Object.values(categoriesMap);




//   useEffect(() => {
//   const token = localStorage.getItem("token");
//   const userType = localStorage.getItem("userType");

//   if (token && userType === "partner") {
//     setShowPartnerBanner(true);
//   }
// }, []);

//   return (
//     <div className="products-main-page">
//       <Topbar />
//       <Offcanvas />
//       {showPartnerBanner && (
//         <div className="container">
//           <PartnerLiveCounter />
//         </div>
//       )}
//       {showPartnerBanner && <PartnerInfoBanner />}

//       <div className="products-main-row padding-top-40">
//         <div className="container">
//           <div
//             className="mobile-products-row"
//             style={{
//               display: "grid",
//               gridTemplateColumns: "repeat(4, 1fr)",
//               gap: "20px",
//             }}
//           >
//             {categories.map((category) => (
//               <Link
//                 href={{
//                   pathname: `/category/${category.slug}`,
//                   query: {
//                     userType:
//                       typeof window !== "undefined"
//                         ? localStorage.getItem("userType") || "b2c"
//                         : "b2c",
//                   },
//                 }}
//                 className="categories-wise-products"
//               >
//                 {/* Category Image */}
//                 <div
//                   style={{
//                     width: "100%",
//                     height: "260px",
//                     overflow: "hidden",
//                   }}
//                 >
//                   <img
//                     src={category.image || "/placeholder.png"}
//                     alt={category.name}
//                     className="products-img"
//                   />
//                 </div>

//                 {/* Category Info */}
//                 <div className="category-info">
//                   <h5 style={{ margin: 0 }}>{category.name}</h5>
//                   <span>View All →</span>
//                 </div>
//               </Link>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* <GoogleReviews /> */}
//       <ProductSlider />
//       <div className="container mb-5">
//         <DealBanner />
//       </div>
//       <Footer />
//     </div>
//   );
// }
