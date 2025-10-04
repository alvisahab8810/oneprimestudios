"use client"; // only if using Next.js App Router

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode } from "swiper/modules";
import Link from "next/link"; // or react-router-dom's Link

// import "./Categories.css"; // custom css

const categories = [
  {
    id: 1,
    title: "Visiting card",
    image: "/assets/images/categories/visiting-card.png",
  },
  {
    id: 2,
    title: "Paper bag printing",
    image: "/assets/images/categories/paper-bag.png",
  },
  {
    id: 3,
    title: "Custom Polo T-shirts",
    image: "/assets/images/categories/polo-tshirt.png",
  },
  {
    id: 4,
    title: "Custom winter wear",
    image: "/assets/images/categories/winter-wear.png",
  },
  { id: 5, title: "ID Cards", image: "/assets/images/categories/id-card.png" },
  {
    id: 6,
    title: "Book Printing",
    image: "/assets/images/categories/visiting-card.png",
  },
  {
    id: 7,
    title: "Stickers",
    image: "/assets/images/categories/paper-bag.png",
  },

  {
    id: 1,
    title: "Visiting card",
    image: "/assets/images/categories/visiting-card.png",
  },
  {
    id: 2,
    title: "Paper bag printing",
    image: "/assets/images/categories/paper-bag.png",
  },
  {
    id: 3,
    title: "Custom Polo T-shirts",
    image: "/assets/images/categories/polo-tshirt.png",
  },
  {
    id: 4,
    title: "Custom winter wear",
    image: "/assets/images/categories/winter-wear.png",
  },
  { id: 5, title: "ID Cards", image: "/assets/images/categories/id-card.png" },
  {
    id: 6,
    title: "Book Printing",
    image: "/assets/images/categories/visiting-card.png",
  },
  {
    id: 7,
    title: "Stickers",
    image: "/assets/images/categories/paper-bag.png",
  },
];

export default function Categories() {
  return (
    <div className="categories-section">
      {/* Header */}

      <div className="container">
        <div className="categories-header">
          <h3 className="categories-title">Explore all categories</h3>
          <Link href="/categories" className="view-all-link">
            View All →
          </Link>
        </div>

        {/* Underline */}
        <div className="underline"></div>
      </div>

      {/* Swiper Slider */}
      <Swiper
        slidesPerView={6.5}
        spaceBetween={20}
        freeMode={true}
        grabCursor={true}
        modules={[FreeMode]}
        className="categories-swiper"
        breakpoints={{
          320: { slidesPerView: 2, spaceBetween: 10 },
          640: { slidesPerView: 3, spaceBetween: 15 },
          1024: { slidesPerView: 6.5, spaceBetween: 30 },
        }}
      >
        {categories.map((cat) => (
          <SwiperSlide key={cat.id}>
            <div className="category-card">
              <Link href="#">
               <div className="category-img-wrap">
                <img src={cat.image} alt={cat.title} className="category-img" />
              </div>
              <p className="category-title">{cat.title}</p>
              </Link>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
