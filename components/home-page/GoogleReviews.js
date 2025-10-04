"use client"; // only if using Next.js App Router

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination } from "swiper/modules";

const reviews = [
  {
    id: 1,
    name: "Chloe Patterson",
    date: "May 5, 2023",
    avatar: "/reviews/user1.jpg",
    rating: 4,
    text: "Great quality and attention to detail. Their designs elevated my brand. I just wish they had a more flexible payment plan for small businesses.",
  },
  {
    id: 2,
    name: "Ethan Morris",
    date: "May 5, 2023",

    avatar: "/reviews/user2.jpg",
    rating: 5,
    text: "They are skilled professionals and the service was exceptional. Their structures eliminated unexpected costs upfront.",
  },
  {
    id: 3,
    name: "Sophia Williams",
    date: "May 5, 2023",

    avatar: "/reviews/user3.jpg",
    rating: 5,
    text: "Absolutely loved working with them! The designs exceeded expectations and delivery was right on time. exceeded expectations and ",
  },

  {
    id: 1,
    name: "Chloe Patterson",
    date: "May 5, 2023",
    avatar: "/reviews/user1.jpg",
    rating: 4,
    text: "Great quality and attention to detail. Their designs elevated my brand. I just wish they had a more flexible payment plan for small businesses.",
  },
  {
    id: 2,
    name: "Ethan Morris",
    date: "May 5, 2023",

    avatar: "/reviews/user2.jpg",
    rating: 5,
    text: "They are skilled professionals and the service was exceptional. Their structures eliminated unexpected costs upfront.",
  },
  {
    id: 3,
    name: "Sophia Williams",
    date: "May 5, 2023",

    avatar: "/reviews/user3.jpg",
    rating: 5,
    text: "Absolutely loved working with them! The designs exceeded expectations and delivery was right on time. exceeded expectations and ",
  },
];

export default function GoogleReviews() {
  return (
    <div className="reviews-section">
      <h3 className="reviews-title">Google Reviews</h3>

      <Swiper
        slidesPerView={3.3}
        spaceBetween={30}
        grabCursor={true}

        // pagination={{ clickable: true }}
        modules={[Pagination]}
        breakpoints={{
          320: { slidesPerView: 1 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3.3 },
        }}
        className="reviews-swiper"
      >
        {reviews.map((review) => (
          <SwiperSlide key={review.id}>
            <div className="review-card">
              <div className="review-header">
                <div className="review-user">
                  <img
                    src={"/assets/images/reviews/user-profile.png"}
                    alt={review.name}
                    className="review-avatar"
                  />
                  <div className="info">
                    <span className="review-name">{review.name}</span>
                    <p className="review-date">{review.date}</p>
                  </div>
                </div>
                <img
                  src="/assets/images/reviews/google.png"
                  alt="Google"
                  className="google-logo"
                />
              </div>

              {/* Rating */}
              <div className="review-rating">
                <img
                  src="/assets/images/reviews/rating.png"
                  alt="Rating"
                  className="google-logo"
                />
              </div>

              {/* Text */}
              <p className="review-text">{review.text}</p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
