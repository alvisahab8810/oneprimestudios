"use client";
import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

const PartnerInfoSlider = () => {
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
        {/* SLIDE 1 */}
        <SwiperSlide>
          <div className="partner-slide">
            <p className="tag">Partner Update</p>
            <h3>Exclusive Partner Pricing Active</h3>
            <p className="desc">
              You are viewing special B2B prices available only for registered
              partners.
            </p>
          </div>
        </SwiperSlide>

        {/* SLIDE 2 */}
        <SwiperSlide>
          <div className="partner-slide">
            <p className="tag">GST Information</p>
            <h3>GST Is Optional at Checkout</h3>
            <p className="desc">
              Add GST only if you need a tax invoice. You can proceed without it.
            </p>
          </div>
        </SwiperSlide>

        {/* SLIDE 3 */}
        <SwiperSlide>
          <div className="partner-slide">
            <p className="tag">Bulk Orders</p>
            <h3>Better Prices on Higher Quantities</h3>
            <p className="desc">
              Bulk discounts apply automatically based on quantity.
            </p>
          </div>
        </SwiperSlide>

        {/* Navigation */}
        <div className="partner-nav-btn partner-prev-btn">❮</div>
        <div className="partner-nav-btn partner-next-btn">❯</div>
      </Swiper>
      </div>
    </section>
  );
};

export default PartnerInfoSlider;
