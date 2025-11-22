"use client"; // only if using Next.js App Router

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import Link from "next/link";
import { Pagination } from "swiper/modules";

const reviews = [
  {
    id: 1,
    name: "Vaibhav Dosar",
    date: "5 years ago",
    avatar: "/assets/images/reviews/v.png",
    rating: 4,
    text: "Their team handled our projects across multiple cities with great professionalism. The quality of work was impressive and completely worth appreciating. Highly recommended for creative shoots.",
  },
  {
    id: 2,
    name: "Dinesh Sharma",
    date: "5 years ago",
    avatar: "/assets/images/reviews/d.png",
    rating: 5,
    text: "A very dedicated and skilled team. The service quality was excellent, and the clarity in their process helped avoid any surprises. Truly reliable professionals for all kinds of shoots.",
  },
  {
    id: 3,
    name: "Ravi Kumar",
    date: "5 years ago",
    avatar: "/assets/images/reviews/r.png",
    rating: 5,
    text: "One of the best photography teams I’ve worked with. Their behavior, creativity, and commitment made the experience outstanding. Would strongly recommend them for weddings and events.",
  },

  {
    id: 1,
    name: "Anmol Malik",
    date: "5 years ago",
    avatar: "/assets/images/reviews/c.png",
    rating: 4,
    text: "A great place for wedding shoots and portfolios. The overall experience was smooth and they delivered everything on time. Really happy with the quality and professionalism of the team.",
  },
  {
    id: 2,
    name: "Shubham Mishra",
    date: "3 months ago",
    avatar: "/assets/images/reviews/s.png",
    rating: 5,
    text: "Amazing work and a very friendly team. They treat every client with care and deliver fantastic results. The overall experience was wonderful and truly worth appreciating.",
  },
  {
    id: 3,
    name: "Priyanshi Dosar",
    date: "5 years ago",
    avatar: "/assets/images/reviews/priyanshi.png",
    rating: 5,
    text: "Excellent service and great quality work. Completely satisfied with the results. The team was polite, creative, and made the entire process very comfortable. Highly recommended.",
  },

   {
    id: 3,
    name: "Aditya verma",
    date: "5 years ago",
    avatar: "/assets/images/reviews/aditya.png",
    rating: 5,
    text: "Very nice place ! Service is damn awesome i would love to visit again here nd recommend u to plz visit once !",
  },


     {
    id: 3,
    name: "Anupriya Nishad",
    date: "5 years ago",
    avatar: "/assets/images/reviews/anu.png",
    rating: 5,
    text: "The place is worth visiting. They really have knowledge of the work which they are doing.",
  },

  
     {
    id: 3,
    name: "Salman Khan",
    date: "5 years ago",
    avatar: "/assets/images/reviews/salman.png",
    rating: 5,
    text: "Best photographer in the town they captured 3 projects if us.. The work done by them is really fantastic ...... 10 stars",
  },


    {
    id: 3,
    name: "Izaani",
    date: "6 years ago",
    avatar: "/assets/images/reviews/iizaami.png",
    rating: 5,
    text: "They do amazing photography!! If u watching this review ..u should immediately hire them for photoshoots and other contents!!",
  },
];

export default function GoogleReviews() {
  return (
    <>
      <div className="container mobile-none">
        <div className="categories-header">
          <h3 className="categories-title">Google Reviews</h3>
        </div>

        <div className="underline"></div>
      </div>

      <div className="reviews-section">
        {/* <h3 className="reviews-title mobile-none">Google Reviews</h3> */}

        <div className="desktop-none">
          <div className="categories-header mobile-products">
            <h3 className="categories-title">Google Reviews</h3>
            <Link href="#" className="view-all-link">
              View All <img src="/assets/images/icons/arrow.svg"></img>
            </Link>
          </div>
        </div>

        <Swiper
          slidesPerView={3.3}
          spaceBetween={30}
          grabCursor={true}
          loop={true}
          // pagination={{ clickable: true }}
          modules={[Pagination]}
          breakpoints={{
            320: {
              slidesPerView: 1.3,

              spaceBetween: 10,
            },

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
                      src={review.avatar}
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
    </>
  );
}
