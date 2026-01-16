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
import Offcanvas from "@/components/header/Offcanvas";
import PartnerInfoBanner from "@/components/partner/PartnerInfoBanner";
import PartnerLiveCounter from "@/components/partner/PartnerLiveCounter";

export default function Products() {
  const [products, setProducts] = useState([]);
const [showPartnerBanner, setShowPartnerBanner] = useState(false);
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

  // useEffect(() => {
  //   const userType = localStorage.getItem("userType");
  //   let url = "/api/products";
  //   if (userType) url += `?userType=${userType}`;

  //   axios.get(url).then((res) => setProducts(res.data));
  // }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userType = localStorage.getItem("userType");

    let url = "/api/products";

    // If not logged in → force B2C only
    if (!token) {
      url += "?userType=b2c";
    } else {
      // Logged-in users → use saved userType (b2b or b2c)
      url += `?userType=${userType || "b2c"}`;
    }

    // axios.get(url).then((res) => setProducts(res.data));

    const searchParams = new URLSearchParams(window.location.search);
    const search = searchParams.get("search") || "";

    if (search) url += `&search=${encodeURIComponent(search)}`;

    axios.get(url).then((res) => setProducts(res.data));
  }, []);

  const categoriesMap = products.reduce((acc, product) => {
    if (product.category && product.category._id) {
      acc[product.category._id] = product.category;
    }
    return acc;
  }, {});

  const categories = Object.values(categoriesMap);




  useEffect(() => {
  const token = localStorage.getItem("token");
  const userType = localStorage.getItem("userType");

  if (token && userType === "partner") {
    setShowPartnerBanner(true);
  }
}, []);

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
          <div
            className="mobile-products-row"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "20px",
            }}
          >
            {categories.map((category) => (
              <Link
                href={{
                  pathname: `/category/${category.slug}`,
                  query: {
                    userType:
                      typeof window !== "undefined"
                        ? localStorage.getItem("userType") || "b2c"
                        : "b2c",
                  },
                }}
                className="categories-wise-products"
              >
                {/* Category Image */}
                <div
                  style={{
                    width: "100%",
                    height: "260px",
                    overflow: "hidden",
                  }}
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
        </div>
      </div>

      {/* <GoogleReviews /> */}
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

// export default function Products() {
//   const [products, setProducts] = useState([]);

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
//   const token = localStorage.getItem("token");
//   const userType = localStorage.getItem("userType");

//   let url = "/api/products";

//   // If not logged in → force B2C only
//   if (!token) {
//     url += "?userType=b2c";
//   } else {
//     // Logged-in users → use saved userType (b2b or b2c)
//     url += `?userType=${userType || "b2c"}`;
//   }

//   // axios.get(url).then((res) => setProducts(res.data));

//   const searchParams = new URLSearchParams(window.location.search);
// const search = searchParams.get("search") || "";

// if (search) url += `&search=${encodeURIComponent(search)}`;

// axios.get(url).then((res) => setProducts(res.data));

// }, []);

//   return (
//     <div className="products-main-page">
//         <Topbar />
//         <Offcanvas/>
//          <div className="products-main-row padding-top-40">
//            <div className="container">

//         <div className="mobile-products-container">
//            {products.length === 0 ? (
//   <div className="no-products" style={{ textAlign: "center", padding: "40px 0" }}>
//     <h3>No products found</h3>
//     <p>Try searching with different keywords.</p>
//   </div>
// ) : (
//   <div
//     className="mobile-products-row"
//     style={{
//       display: "grid",
//       gridTemplateColumns: "repeat(4, 1fr)",
//       gap: "15px",
//     }}
//   >
//     {products.map((product) => (
//       <div
//         key={product._id}
//         style={{
//           position: "relative",
//           borderRadius: "10px",
//           overflow: "hidden",
//         }}
//       >
//         {/* Wishlist Button */}
//         <div
//           className="products-wishlist"
//           onClick={(e) => toggleWishlist(product._id, e)}
//           style={{
//             position: "absolute",
//             top: "10px",
//             right: "10px",
//             zIndex: 10,
//             background: "#fff",
//             borderRadius: "50%",
//             padding: "6px",
//             cursor: "pointer",
//             boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
//             display: "flex",
//           }}
//         >
//           {wishlist.includes(product._id) ? (
//             <FaHeart color="red" size={20} />
//           ) : (
//             <FaRegHeart color="gray" size={20} />
//           )}
//         </div>

//         {/* Product Card */}
//         <Link
//           className="products-image-card"
//           href={`/products/${product.slug}`}
//           style={{
//             display: "block",
//             borderRadius: "10px",
//             textDecoration: "none",
//             color: "inherit",
//           }}
//         >
//           <img
//             src={product.mainImage || "/placeholder.png"}
//             alt={product.name || "Product Image"}
//             style={{
//               width: "100%",
//               height: "313px",
//               objectFit: "cover",
//               borderRadius: "15px",
//             }}
//           />
//           <h6 style={{ marginTop: "10px" }}>{product.name}</h6>
//         </Link>
//       </div>
//     ))}
//   </div>
// )}

//         </div>
//       </div>
//          </div>

//       {/* <GoogleReviews /> */}
//       <ProductSlider />
//       <div className="container mb-5">
//         <DealBanner />
//       </div>
//       <Footer />
//     </div>
//   );
// }
