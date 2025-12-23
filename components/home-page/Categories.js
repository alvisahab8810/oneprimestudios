// "use client"; // only if using Next.js App Router

// import React from "react";
// import { Swiper, SwiperSlide } from "swiper/react";
// import "swiper/css";
// import "swiper/css/free-mode";
// import { FreeMode } from "swiper/modules";
// import Link from "next/link"; // or react-router-dom's Link

// // import "./Categories.css"; // custom css

// const categories = [
//   {
//     id: 1,
//     title: "Visiting card",
//     image: "/assets/images/categories/visiting-card.png",
//   },
//   {
//     id: 2,
//     title: "Paper bag printing",
//     image: "/assets/images/categories/paper-bag.png",
//   },
//   {
//     id: 3,
//     title: "Custom Polo T-shirts",
//     image: "/assets/images/categories/polo-tshirt.png",
//   },
//   {
//     id: 4,
//     title: "Custom winter wear",
//     image: "/assets/images/categories/winter-wear.png",
//   },
//   { id: 5, title: "ID Cards", image: "/assets/images/categories/id-card.png" },
//   {
//     id: 6,
//     title: "Book Printing",
//     image: "/assets/images/categories/visiting-card.png",
//   },
//   {
//     id: 7,
//     title: "Stickers",
//     image: "/assets/images/categories/paper-bag.png",
//   },

//   {
//     id: 1,
//     title: "Visiting card",
//     image: "/assets/images/categories/visiting-card.png",
//   },
//   {
//     id: 2,
//     title: "Paper bag printing",
//     image: "/assets/images/categories/paper-bag.png",
//   },
//   {
//     id: 3,
//     title: "Custom Polo T-shirts",
//     image: "/assets/images/categories/polo-tshirt.png",
//   },
//   {
//     id: 4,
//     title: "Custom winter wear",
//     image: "/assets/images/categories/winter-wear.png",
//   },
//   { id: 5, title: "ID Cards", image: "/assets/images/categories/id-card.png" },
//   {
//     id: 6,
//     title: "Book Printing",
//     image: "/assets/images/categories/visiting-card.png",
//   },
//   {
//     id: 7,
//     title: "Stickers",
//     image: "/assets/images/categories/paper-bag.png",
//   },
// ];

// export default function Categories() {
//   return (
//     <div className="categories-section">
//       {/* Header */}

//       <div className="container">
//         <div className="categories-header">
//           <h3 className="categories-title">Explore all categories</h3>
//           <Link href="/categories" className="view-all-link">
//             View All <img src="/assets/images/icons/arrow.svg"></img>
//           </Link>
//         </div>

//         {/* Underline */}
//         <div className="underline"></div>
//       </div>

//       {/* Swiper Slider */}
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
//           <SwiperSlide key={cat.id}>
//             <div className="category-card">
//               <Link href="#">
//                <div className="category-img-wrap">
//                 <img src={cat.image} alt={cat.title} className="category-img" />
//               </div>
//               <p className="category-title">{cat.title}</p>
//               </Link>
//             </div>
//           </SwiperSlide>
//         ))}
//       </Swiper>
//     </div>
//   );
// }





"use client";

import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode } from "swiper/modules";
import Link from "next/link";
import axios from "axios";

// KEEP YOUR IMAGES HERE
const categoryImages = {
  "visiting card": "/assets/images/categories/paper-bag.png",
  "b2b": "/assets/images/categories/visiting-card.png",
  "letterpad": "/assets/images/categories/paper-bag.png",
  "b2c": "/assets/images/categories/polo-tshirt.png",
  "gloss coated cards": "/assets/images/categories/winter-wear.png",
  "pemplates": "/assets/images/categories/id-card.png",
  "poster": "/assets/images/categories/visiting-card.png",
  
};


const getUserType = () => {
  if (typeof window === "undefined") return "b2c";

  const token = localStorage.getItem("token");
  const userType = localStorage.getItem("userType");

  if (!token) return "b2c";
  return userType === "partner" || userType === "b2b" ? "b2b" : "b2c";
};


export default function Categories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch only parent categories


  const fetchCategories = async () => {
  try {
    const userType = getUserType();

    // 1️⃣ Fetch products filtered by userType
    const res = await axios.get(`/api/products?userType=${userType}`);
    const products = res.data || [];

    // 2️⃣ Extract unique categories from products
    const categoryMap = {};
    products.forEach((p) => {
      if (p.category && p.category._id) {
        categoryMap[p.category._id] = p.category;
      }
    });

    // 3️⃣ Set categories
    setCategories(Object.values(categoryMap));
  } catch (err) {
    console.error("Error fetching categories:", err);
  }
};



  const getImage = (cat) => {
  if (cat.image) {
    return cat.image.startsWith("http")
      ? cat.image
      : `${cat.image}`;
  }
  return "/assets/images/categories/default.png";
};


  return (
    <div className="categories-section">
      <div className="container">
        <div className="categories-header">
          <h3 className="categories-title">Explore all categories</h3>
          {/* <Link href="/categories" className="view-all-link">
            View All <img src="/assets/images/icons/arrow.svg" />
          </Link> */}
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
                    query: {
                      userType:
                        typeof window !== "undefined"
                          ? localStorage.getItem("userType") === "partner"
                            ? "b2b"
                            : "b2c"
                          : "b2c",
                    },
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
