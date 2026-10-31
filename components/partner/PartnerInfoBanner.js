"use client";
import React from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import useSectionMedia from "@/lib/useSectionMedia";

// Shown until pictures are added from the dashboard. Rows saved before this
// strip took pictures carry wording instead of a file, and still render.
const BUILT_IN = [
  {
    _id: "built-in-1",
    tag: "Partner Update",
    title: "Exclusive Partner Pricing Active",
    description:
      "You are viewing special B2B prices available only for registered partners.",
  },
  {
    _id: "built-in-2",
    tag: "GST Information",
    title: "GST Is Optional at Checkout",
    description:
      "Add GST only if you need a tax invoice. You can proceed without it.",
  },
  {
    _id: "built-in-3",
    tag: "Bulk Orders",
    title: "Better Prices on Higher Quantities",
    description: "Bulk discounts apply automatically based on quantity.",
  },
];

const PartnerInfoSlider = () => {
  const managed = useSectionMedia("products-info");
  const slides = managed.length ? managed : BUILT_IN;

  return (
    <section className="partner-info-slider">
      <div className="container">
        <Swiper
          modules={[Autoplay, Navigation]}
          autoplay={{ delay: 3500, disableOnInteraction: false }}
          loop={true}
          navigation={{
            prevEl: ".partner-prev-btn",
            nextEl: ".partner-next-btn",
          }}
          className="partner-slider"
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide._id}>
              {slide.src ? (
                <div className="partner-slide partner-slide--image">
                  {slide.link ? (
                    <Link href={slide.link} className="partner-slide__link">
                      <img
                        src={slide.src}
                        alt={slide.alt || ""}
                        className="partner-slide__img"
                      />
                    </Link>
                  ) : (
                    <img
                      src={slide.src}
                      alt={slide.alt || ""}
                      className="partner-slide__img"
                    />
                  )}
                </div>
              ) : (
                <div className="partner-slide">
                  {slide.tag ? <p className="tag">{slide.tag}</p> : null}
                  <h3>{slide.title}</h3>
                  {slide.description ? (
                    <p className="desc">{slide.description}</p>
                  ) : null}
                </div>
              )}
            </SwiperSlide>
          ))}

          {/* Navigation */}
          <div className="partner-nav-btn partner-prev-btn">❮</div>
          <div className="partner-nav-btn partner-next-btn">❯</div>
        </Swiper>
      </div>
    </section>
  );
};

export default PartnerInfoSlider;
