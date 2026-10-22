"use client";
import React from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import useSectionMedia from "@/lib/useSectionMedia";

import "swiper/css";
// import "swiper/css/pagination";

import { Pagination, Autoplay } from "swiper/modules"; // correct import for autoplay

function MobileHeroSlider() {
  return (
    <div className="mobile-hero-area desktop-none" id="herosection-mobile">

  
      <Swiper
        modules={[Pagination, Autoplay]}
        spaceBetween={10}
        slidesPerView={1.1}
        grabCursor="true"

        loop={true}
        // pagination={{ clickable: true }}
        autoplay={{ delay: 3500, disableOnInteraction: false }}
      >
        {/* SLIDE 1 */}
        <SwiperSlide>
          <section className="mobile-hero-area__card">
            <div className="mobile-hero-area__inner first-slide-img">
              
              {/* LEFT CONTENT */}
              <div className="mobile-hero-area__content">
                <p className="mobile-hero-area__welcome">Welcome to</p>
                <h2 className="mobile-hero-area__title">One Prime Studios</h2>
                <h3 className="mobile-hero-area__subtitle">
                  Bring Your Ideas to Life with High-Quality Prints and on time Delivery
                </h3>
                

                <div className="mobile-hero-area__btns">
                  <a href="/contact-us" className="mobile-hero-area__btn mobile-hero-area__btn--primary">
                    Get Started
                  </a>
                
                </div>
              </div>

              {/* RIGHT IMAGE (simple HTML img tag) */}
              <div className="mobile-hero-area__image-wrap">
                <div className="mobile-hero-area__image-bg"></div>
                <img
                  src="/assets/images/hero/girl.png"
                  alt=""
                  className="mobile-hero-area__image"
                />
              </div>
            </div>
          </section>
        </SwiperSlide>

        {/* SLIDE 2 */}
        <SwiperSlide>
          <section className="mobile-hero-area__card">
            <div className="mobile-hero-area__inner first-slide1-img">

              <div className="mobile-hero-area__content">
                <p className="mobile-hero-area__welcome">Discover</p>
                <h2 className="mobile-hero-area__title">Print Products</h2>
                <h3 className="mobile-hero-area__subtitle">
                  Explore our wide range of
                   customizable options
                </h3>
               

                <div className="mobile-hero-area__btns">
                  <a href="/contact-us" className="mobile-hero-area__btn mobile-hero-area__btn--primary">
                    Get Started
                  </ a>
                
                </div>
              </div>

              {/* RIGHT IMAGE */}
              <div className="mobile-hero-area__image-wrap">
                <div className="mobile-hero-area__image-bg"></div>
                <img
                  src="/assets/images/hero/girl1.png"
                  alt=""
                  className="mobile-hero-area__image"
                />
              </div>
            </div>
          </section>
        </SwiperSlide>

        {/* SLIDE 3 */}
        <SwiperSlide>
          <section className="mobile-hero-area__card">
            <div className="mobile-hero-area__inner first-slide2-img">

              <div className="mobile-hero-area__content">
                <p className="mobile-hero-area__welcome">Get Started</p>
                <h2 className="mobile-hero-area__title">Business Card</h2>
                <h3 className="mobile-hero-area__subtitle">
                 Explore our wide range of
                  customizable options
                </h3>
               

                <div className="mobile-hero-area__btns">
                  <a href="/contact-us" className="mobile-hero-area__btn mobile-hero-area__btn--primary">
                    Get Started
                  </a>
                  
                </div>
              </div>

              {/* RIGHT IMAGE */}
              <div className="mobile-hero-area__image-wrap">
                <div className="mobile-hero-area__image-bg"></div>
                <img
                  src="/assets/images/hero/girl2.png"
                  alt=""
                  className="mobile-hero-area__image"
                />
              </div>
            </div>
          </section>
        </SwiperSlide>
      </Swiper>
    </div>
  );
}

// Shown until a mobile banner is added from the dashboard
const BUILT_IN = [
  {
    _id: "built-in",
    src: "/assets/images/hero/banner-mobile.png",
    alt: "Custom printing and corporate gifting solutions",
    link: "/products",
  },
];

// Mobile shows a single banner for now. The older slider is left untouched in
// MobileHeroSlider() above — swap the return below to bring it back.
export default function HeroSectionMobile() {
  const managed = useSectionMedia("hero-mobile");
  const slides = managed.length ? managed : BUILT_IN;

  return (
    <div className="mobile-hero-area desktop-none" id="herosection-mobile">
      {slides.length > 1 ? (
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={10}
          slidesPerView={1}
          loop={true}
          autoplay={{ delay: 3500, disableOnInteraction: false }}
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide._id}>
              <MobileBanner slide={slide} />
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        <MobileBanner slide={slides[0]} />
      )}
    </div>
  );
}

function MobileBanner({ slide }) {
  return (
    <div className="mobile-hero-banner">
      <img
        src={slide.src}
        alt={slide.alt || "Custom printing and corporate gifting solutions"}
        className="mobile-hero-banner__img"
      />

      {/* Same as desktop: only the button area is clickable, not the whole banner */}
      <Link
        href={slide.link || "/products"}
        className="mobile-hero-cta-hotspot"
        aria-label={slide.alt || "Explore Corporate Gifts"}
      />
    </div>
  );
}
