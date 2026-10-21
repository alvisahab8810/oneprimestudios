"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-creative";
import { EffectCreative } from "swiper/modules";

// Shown until the uploaded media arrives, and if nothing has been uploaded yet
const FALLBACK = [
  { type: "image", src: "/assets/images/action/item.webp", alt: "Screen printing in action" },
  { type: "image", src: "/assets/images/action/item1.webp", alt: "Offset press run" },
  { type: "image", src: "/assets/images/action/item2.webp", alt: "Finishing and binding" },
];

// dono taraf 2-2 layers dikhane ke liye kam se kam 7 slides chahiye;
// photos repeat ki ja sakti hain, videos nahi - wahan har copy alag se chalti
function buildSlides(list) {
  if (!list.length || list.length >= 7) return list;
  if (list.some((item) => item.type === "video")) return list;

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
  const [items, setItems] = useState(FALLBACK);

  // Sound is on to begin with. A browser that refuses to autoplay with sound
  // flips this to muted rather than leaving the slide frozen on its first frame.
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/action-media");
        const data = await res.json();
        if (!cancelled && Array.isArray(data.items) && data.items.length) {
          setItems(data.items);
        }
      } catch {
        // The built-in slides stay up
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = buildSlides(items);

  // Only the slide on screen plays. Everything else is stopped and wound back,
  // so returning to a video starts it from the beginning rather than mid-clip.
  const applyPlayback = useCallback((sw) => {
    if (!sw?.el) return;

    const activeEl = sw.slides?.[sw.activeIndex];

    sw.el.querySelectorAll("video").forEach((video) => {
      const isActive = activeEl ? activeEl.contains(video) : false;

      if (!isActive) {
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          // Safari throws if metadata has not loaded yet; nothing to undo
        }
        return;
      }

      video.muted = mutedRef.current;

      const started = video.play();
      if (started && typeof started.catch === "function") {
        started.catch(() => {
          // Autoplay with sound was blocked, so fall back to a muted play and
          // let the viewer turn the sound on themselves.
          mutedRef.current = true;
          setMuted(true);
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    });
  }, []);

  const toggleMute = () => {
    const next = !muted;
    mutedRef.current = next;
    setMuted(next);

    const sw = swiperRef.current;
    const activeEl = sw?.slides?.[sw.activeIndex];
    const video = activeEl?.querySelector("video");

    if (video) {
      video.muted = next;
      if (!next) video.play().catch(() => {});
    }
  };

  // A tab change should not leave a clip playing out of sight
  useEffect(() => {
    const onVisibility = () => {
      const sw = swiperRef.current;
      if (!sw?.el) return;

      if (document.hidden) {
        sw.el.querySelectorAll("video").forEach((v) => v.pause());
      } else {
        applyPlayback(sw);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [applyPlayback]);

  if (!slides.length) return null;

  const activeItem = items[active % items.length];
  const activeIsVideo = activeItem?.type === "video";

  return (
    <section className="action-section">
      <div className="container">
        <h2 className="action-heading">
          See it <span>in Action</span>
        </h2>
      </div>

      <div className="action-slider">
        <Swiper
          /* Uploaded media replaces the built-in slides once it arrives, and a
             loop swiper has to be rebuilt when its slide count changes */
          key={slides.map((s) => s.src).join("|")}
          onSwiper={(sw) => {
            swiperRef.current = sw;
            paintDepth(sw);
            applyPlayback(sw);
          }}
          onSlideChange={(sw) => {
            setActive(sw.realIndex);
            paintDepth(sw);
            applyPlayback(sw);
          }}
          modules={[EffectCreative]}
          effect="creative"
          creativeEffect={{
            limitProgress: 2,
            /* stack effect: cards apni jagah rehte hain, peeche wala aage aata hai */
            /* 28.75% of 800 = 230px -> har side 150px peek; scale 0.8 -> 640x320, 0.6 -> 480x240 */
            prev: { translate: ["-28.75%", 0, -1], scale: 0.8, opacity: 1 },
            next: { translate: ["28.75%", 0, -1], scale: 0.8, opacity: 1 },
          }}
          slidesPerView={1}
          loop={slides.length >= 3}
          /* shuru me bhi dono taraf 2-2 layers rahen */
          initialSlide={slides.length >= 5 ? 2 : 0}
          loopAdditionalSlides={3}
          watchSlidesProgress
          grabCursor
          speed={700}
          className="action-swiper"
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={slide.src + index} className="action-slide">
              {slide.type === "video" ? (
                <video
                  src={slide.src}
                  className="action-img action-video"
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={slide.alt || "One Prime Studios in action"}
                />
              ) : (
                <img
                  src={slide.src}
                  alt={slide.alt || ""}
                  className="action-img"
                  loading="lazy"
                />
              )}
            </SwiperSlide>
          ))}
        </Swiper>

        {activeIsVideo && (
          <button
            type="button"
            className="action-mute"
            onClick={toggleMute}
            aria-label={muted ? "Unmute video" : "Mute video"}
          >
            {muted ? "🔇 Unmute" : "🔊 Mute"}
          </button>
        )}

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
          {/* dots unique media ke hisaab se (photos repeat ho sakti hain) */}
          <div className="action-dots">
            {items.map((slide, index) => (
              <button
                key={"dot-" + slide.src + index}
                type="button"
                aria-label={"Go to slide " + (index + 1)}
                className={
                  "action-dot" +
                  (index === active % items.length ? " is-active" : "")
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
