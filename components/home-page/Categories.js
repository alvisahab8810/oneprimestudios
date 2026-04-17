// components/home-page/Categories.js
// FIX: Fetches parent categories directly from /api/categories?parents=true
// instead of extracting from products (which showed child categories and
// missed parents that had no products yet).
// B2B/B2C logic fully preserved.

"use client";

import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode } from "swiper/modules";
import Link from "next/link";
import axios from "axios";

const getUserTypeForLink = () => {
  if (typeof window === "undefined") return "b2c";
  const userType = localStorage.getItem("userType");
  return userType === "partner" || userType === "b2b" ? "b2b" : "b2c";
};

export default function Categories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchParentCategories = async () => {
      try {
        const userType = localStorage.getItem("userType") || "b2c";
        const res = await axios.get(`/api/categories?parents=true&userType=${userType}`);
        setCategories(res.data || []);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };

    fetchParentCategories();
  }, []);

  const getImage = (cat) => {
    if (cat.image) return cat.image;
    return "/assets/images/categories/default.png";
  };

  return (
    <div className="categories-section">
      <div className="container">
        <div className="categories-header">
          <h3 className="categories-title">Explore all categories</h3>
        </div>
        <div className="underline"></div>
      </div>

      <Swiper
        slidesPerView={6.5}
        spaceBetween={20}
        freeMode={true}
        grabCursor={true}
        modules={[FreeMode]}
        className="categories-swiper"
        breakpoints={{
          320: { slidesPerView: 4, spaceBetween: 5 },
          640: { slidesPerView: 3, spaceBetween: 15 },
          1024: { slidesPerView: 6.5, spaceBetween: 30 },
        }}
      >
        {categories.map((cat) => (
          <SwiperSlide key={cat._id}>
            <div className="category-card">
              <Link
                href={{
                  pathname: `/category/${cat.slug}`,
                  query: { userType: getUserTypeForLink() },
                }}
              >
                <div className="category-img-wrap">
                  <img
                    src={getImage(cat)}
                    alt={cat.name}
                    className="category-img"
                  />
                </div>
                <p className="category-title">{cat.name}</p>
              </Link>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}





// "use client";

// import React, { useEffect, useState } from "react";
// import { Swiper, SwiperSlide } from "swiper/react";
// import "swiper/css";
// import "swiper/css/free-mode";
// import { FreeMode } from "swiper/modules";
// import Link from "next/link";
// import axios from "axios";

// // KEEP YOUR IMAGES HERE
// const categoryImages = {
//   "visiting card": "/assets/images/categories/paper-bag.png",
//   "b2b": "/assets/images/categories/visiting-card.png",
//   "letterpad": "/assets/images/categories/paper-bag.png",
//   "b2c": "/assets/images/categories/polo-tshirt.png",
//   "gloss coated cards": "/assets/images/categories/winter-wear.png",
//   "pemplates": "/assets/images/categories/id-card.png",
//   "poster": "/assets/images/categories/visiting-card.png",
  
// };


// const getUserType = () => {
//   if (typeof window === "undefined") return "b2c";

//   const token = localStorage.getItem("token");
//   const userType = localStorage.getItem("userType");

//   if (!token) return "b2c";
//   return userType === "partner" || userType === "b2b" ? "b2b" : "b2c";
// };


// export default function Categories() {
//   const [categories, setCategories] = useState([]);

//   useEffect(() => {
//     fetchCategories();
//   }, []);

//   // Fetch only parent categories


//   const fetchCategories = async () => {
//   try {
//     const userType = getUserType();

//     // 1️⃣ Fetch products filtered by userType
//     const res = await axios.get(`/api/products?userType=${userType}`);
//     const products = res.data || [];

//     // 2️⃣ Extract unique categories from products
//     const categoryMap = {};
//     products.forEach((p) => {
//       if (p.category && p.category._id) {
//         categoryMap[p.category._id] = p.category;
//       }
//     });

//     // 3️⃣ Set categories
//     setCategories(Object.values(categoryMap));
//   } catch (err) {
//     console.error("Error fetching categories:", err);
//   }
// };



//   const getImage = (cat) => {
//   if (cat.image) {
//     return cat.image.startsWith("http")
//       ? cat.image
//       : `${cat.image}`;
//   }
//   return "/assets/images/categories/default.png";
// };


//   return (
//     <div className="categories-section">
//       <div className="container">
//         <div className="categories-header">
//           <h3 className="categories-title">Explore all categories</h3>
//           {/* <Link href="/categories" className="view-all-link">
//             View All <img src="/assets/images/icons/arrow.svg" />
//           </Link> */}
//         </div>

//         <div className="underline"></div>
//       </div>

//       <Swiper
//         slidesPerView={6.5}
//         spaceBetween={20}
//         freeMode={true}
//         grabCursor={true}
//         modules={[FreeMode]}
//         className="categories-swiper"
//         breakpoints={{
//           320: { slidesPerView: 4, spaceBetween: 5 },
//           640: { slidesPerView: 3, spaceBetween: 15 },
//           1024: { slidesPerView: 6.5, spaceBetween: 30 },
//         }}
//       >
//         {categories.map((cat) => (
//           <SwiperSlide key={cat._id}>
//             <div className="category-card">
//               <Link
//                   href={{
//                     pathname: `/category/${cat.slug}`,
//                     query: {
//                       userType:
//                         typeof window !== "undefined"
//                           ? localStorage.getItem("userType") === "partner"
//                             ? "b2b"
//                             : "b2c"
//                           : "b2c",
//                     },
//                   }}
//                 >

//                 <div className="category-img-wrap">
//                   <img
//                     src={getImage(cat)}
//                     alt={cat.name}
//                     className="category-img"
//                   />
//                 </div>
//                 <p className="category-title">{cat.name}</p>
//               </Link>
//             </div>
//           </SwiperSlide>
//         ))}
//       </Swiper>
//     </div>
//   );
// }
