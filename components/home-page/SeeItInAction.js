"use client";

import React, { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-creative";
import { Autoplay, EffectCreative } from "swiper/modules";

// yahan apni images add/replace kar dena
const SLIDES = [
  { src: "/assets/images/action/item.webp", alt: "Screen printing in action" },
  { src: "/assets/images/action/item1.webp", alt: "Offset press run" },
  { src: "/assets/images/action/item2.webp", alt: "Finishing and binding" },
];

// dono taraf 2-2 layers dikhane ke liye kam se kam 5 slides chahiye;
// kam images hone par list repeat kar dete hain
function buildSlides(list) {
  if (!list.length || list.length >= 7) return list;
  const out = [];
  while (out.length < 7) out.push(...list);
  return out;
}

// sirf active + dono taraf 2-2 layers dikhani hain, baaki chhupa dete hain
function paintDepth(sw) {
  sw.slides.forEach((el, i) => {
    const d = Math.abs(i - sw.activeIndex);
    el.style.opacity = d <= 2 ? "1" : "0";
  });
}

export default function SeeItInAction() {
  const swiperRef = useRef(null);
  const [active, setActive] = useState(0);

  const slides = buildSlides(SLIDES);

  if (!slides.length) return null;

  return (
    <section className="action-section">
      <div className="container">
        <h2 className="action-heading">
          See it <span>in Action</span>
        </h2>
      </div>

      <div className="action-slider">
        <Swiper
          onSwiper={(sw) => {
            swiperRef.current = sw;
            paintDepth(sw);
          }}
          onSlideChange={(sw) => {
            setActive(sw.realIndex);
            paintDepth(sw);
          }}
          modules={[Autoplay, EffectCreative]}
          effect="creative"
          creativeEffect={{
            limitProgress: 2,
            /* stack effect: cards apni jagah rehte hain, peeche wala aage aata hai */
            /* 28.75% of 800 = 230px -> har side 150px peek; scale 0.8 -> 640x320, 0.6 -> 480x240 */
            prev: { translate: ["-28.75%", 0, -1], scale: 0.8, opacity: 1 },
            next: { translate: ["28.75%", 0, -1], scale: 0.8, opacity: 1 },
          }}
          slidesPerView={1}
          loop
          /* shuru me bhi dono taraf 2-2 layers rahen */
          initialSlide={2}
          loopAdditionalSlides={3}
          watchSlidesProgress
          grabCursor
          speed={700}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          className="action-swiper"
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={slide.src + index} className="action-slide">
              <img
                src={slide.src}
                alt={slide.alt}
                className="action-img"
                loading="lazy"
              />
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="action-controls">
          <button
            type="button"
            className="action-nav"
            aria-label="Previous slide"
            onClick={() => swiperRef.current?.slidePrev()}
          >
            &#8592;
          </button>

          {/* custom dots — loop duplicates ki wajah se swiper pagination extra bullets bana raha tha */}
          {/* dots unique images ke hisaab se (slides repeat hoti hain) */}
          <div className="action-dots">
            {SLIDES.map((slide, index) => (
              <button
                key={"dot-" + index}
                type="button"
                aria-label={"Go to slide " + (index + 1)}
                className={
                  "action-dot" +
                  (index === active % SLIDES.length ? " is-active" : "")
                }
                onClick={() => swiperRef.current?.slideToLoop(index)}
              />
            ))}
          </div>


          <button
            type="button"
            className="action-nav"
            aria-label="Next slide"
            onClick={() => swiperRef.current?.slideNext()}
          >
            &#8594;
          </button>
        </div>
      </div>
    </section>
  );
}
