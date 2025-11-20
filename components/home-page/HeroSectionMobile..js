import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
// import "swiper/css/pagination";

import { Pagination, Autoplay } from "swiper/modules"; // correct import for autoplay

export default function HeroSectionMobile() {
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
                  <button className="mobile-hero-area__btn mobile-hero-area__btn--primary">
                    Get Started
                  </button>
                
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
                  <button className="mobile-hero-area__btn mobile-hero-area__btn--primary">
                    Get Started
                  </button>
                
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
                  <button className="mobile-hero-area__btn mobile-hero-area__btn--primary">
                    Get Started
                  </button>
                  
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
