"use client"; // only if using Next.js App Router

import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination, Autoplay } from "swiper/modules";
import { FaStar } from "react-icons/fa";

const reviews = [
  {
    id: 1,
    name: "Ashwat Mani Singh",
    date: "2 weeks ago",
    avatar: "/assets/images/reviews/nish.png",
    rating: 4,
    text: "The quality of the sheet along with the colour is awesome. Apart from that, the owner of the studio is also a great human being. It was great working with you guys. Thanks ❤️",
  },


    {
    id: 1,
    name: "Md Islam",
    date: "a month ago",
    avatar: "/assets/images/reviews/md.png",
    rating: 4,
    text: "Excellent printing service with high-quality results. The team is professional, reliable, and delivers exactly as promised. Print quality is sharp, colors are accurate, and turnaround time is impressive...",
  },



    {
    id: 1,
    name: "Preeti Singh",
    date: "a month ago",
    avatar: "/assets/images/reviews/priti.png",
    rating: 4,
    text: "Outstanding printing service from start to finish. The quality of work is consistently excellent, with sharp detailing and accurate colors that truly stand out. They are highly professional…",
  },


      {
    id: 1,
    name: "Abdul Rahman",
    date: "a month ago",
    avatar: "/assets/images/reviews/abdul.png",
    rating: 4,
    text: "One of the most dependable printing services I have worked with. They pay close attention to details and ensure the final output matches exactly what is approved. Communication is clear...",
  },


        {
    id: 1,
    name: "damini singh",
    date: "a month ago",
    avatar: "/assets/images/reviews/damini.png",
    rating: 4,
    text: "Bahut bahut acha hai yeh or time se affordable price mai kaam ho jata hai ❤️",
  },

  //       {
  //   id: 1,
  //   name: "Agrima Singh",
  //   date: "4 months ago",
  //   avatar: "/assets/images/reviews/a.png",
  //   rating: 4,
  //   text: "Owner is extremely rude. Both service and quality of work are really bad and the requested order is never on time",
  // },



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
    <section className="testimonials-section">
      <div className="container">
        <h2 className="testimonials-heading">
          Client <span>Testimonials</span>
        </h2>
        <p className="testimonials-sub">
          Trusted by brands that demand excellence.
        </p>
      </div>

      <div className="testimonials-slider">
        <Swiper
          slidesPerView={4}
          spaceBetween={24}
          grabCursor={true}
          autoplay={{ delay: 2500, disableOnInteraction: false }}
          loop={true}
          modules={[Pagination, Autoplay]}
          breakpoints={{
            320: { slidesPerView: 1.15, spaceBetween: 14 },
            768: { slidesPerView: 2.2, spaceBetween: 18 },
            1024: { slidesPerView: 3.2, spaceBetween: 20 },
            1280: { slidesPerView: 4, spaceBetween: 24 },
          }}
          className="testimonials-swiper"
        >
          {reviews.map((review, index) => (
            <SwiperSlide key={review.name + index}>
              <div className="testimonial-card">
                <p className="testimonial-text">{review.text}</p>

                <div className="testimonial-footer">
                  <img
                    src={review.avatar}
                    alt={review.name}
                    className="testimonial-avatar"
                    loading="lazy"
                  />
                  <div className="testimonial-meta">
                    <span className="testimonial-name">{review.name}</span>
                    <span className="testimonial-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <FaStar
                          key={i}
                          size={14}
                          color={i < review.rating ? "#FFC300" : "#dcdce1"}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
