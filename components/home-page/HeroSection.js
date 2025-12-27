import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation  } from "swiper/modules";
import "swiper/css";

export default function HeroSection() {
  return (
    <>
      <section className="hero mobile-none">
   

        {/* LEFT SIDE — FULL BACKGROUND SLIDER */}
        <Swiper
          modules={[Autoplay, Navigation ]}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          loop={true}
           navigation={{
            prevEl: ".hero-prev-btn",
            nextEl: ".hero-next-btn",
          }}
          className="hero-left"
        >
          {/* SLIDE 1 */}
          {/* <SwiperSlide>
            <div
              className="hero-slide"
              style={{
                backgroundImage: "url('/assets/images/hero/hero-img.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                height: "100%",
                width: "100%"
              }}
            >

              <div className="hero-text">
                <p className="welcome">Welcome to</p>
                <h2>One Prime Studios</h2>
                <h3>
                  Bring Your Ideas to Life with High-Quality Prints <br />
                  and on time Delivery
                </h3>
                <p className="description">
                  Elementum consectetur at aliquet turpis ultricies felis egestas
                  aliquam porta. Amet vitae.
                </p>

                  <div className="hero-buttons">
                  <a href="/products" className="btn primary">Explore</a>
                  <a href="/contact-us" className="btn secondary">Know More</a>
                </div>
              </div>
            </div>
          </SwiperSlide> */}

          {/* SLIDE 2 */}
          <SwiperSlide>
            <div
              className="hero-slide"
              style={{
                backgroundImage: "url('/assets/images/hero/hero-img.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                height: "100%",
                width: "100%"
              }}
            >
              <div className="hero-text">
                <p className="welcome">Welcome to</p>
                <h2>Premium Printing Services</h2>
                <h3>
                  Quality, Creativity & Fast Delivery <br /> At your fingertips
                </h3>
                <p className="description">
                  Creating products that match your brand identity and vision.
                </p>
              <div className="hero-buttons">
                  <a href="/products" className="btn primary">Explore</a>
                  <a href="/contact-us" className="btn secondary">Know More</a>
                </div>
              </div>
            </div>
          </SwiperSlide>


              {/* SLIDE 3*/}
          <SwiperSlide>
            <div
              className="hero-slide"
              style={{
                backgroundImage: "url('/assets/images/hero/hero-img.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                height: "100%",
                width: "100%"
              }}
            >
              <div className="hero-text">
                <p className="welcome">Welcome to</p>
                <h2>Premium Printing Services</h2>
                <h3>
                  Quality, Creativity & Fast Delivery <br /> At your fingertips
                </h3>
                <p className="description">
                  Creating products that match your brand identity and vision.
                </p>

                <div className="hero-buttons">
                  <a href="/products" className="btn primary">Explore</a>
                  <a href="/contact-us" className="btn secondary">Know More</a>
                </div>
              </div>
            </div>
          </SwiperSlide>

          {/* Slider Navigation Buttons */}
  <div className="hero-nav-btn hero-prev-btn">❮</div>
  <div className="hero-nav-btn hero-next-btn">❯</div>

        </Swiper>

        {/* RIGHT SIDE — UNCHANGED */}
        {/* <div className="hero-right">
          <div className="first-block">
            <img
              src="/assets/images/hero/hero1.png"
              alt="Model wearing t-shirt"
              className="hero-img"
            />
            <div className="right-badge">
              <h2>PRINT Products </h2>
            </div>
          </div>

          <div className="last-block">
            <img
              src="/assets/images/hero/hero2.png"
              alt="Model wearing t-shirt"
              className="hero-img"
            />
            <div className="right-badge">
              <h2>Business Card </h2>
            </div>
          </div>
        </div> */}

      </section>
    </>
  );
}
















// import React from "react";

// export default function HeroSection() {
//   return (
//     <>
//       <section className="hero mobile-none">
//         <div className="hero-left">
//           <div className="hero-text">
//             <p className="welcome">Welcome to</p>
//             <h2>One Prime Studios</h2>
//             <h3>
//               Bring Your Ideas to Life with High-Quality Prints <br />
//               and on time Delivery
//             </h3>
//             <p className="description">
//               Elementum consectetur at aliquet turpis ultricies felis egestas
//               aliquam porta. Amet vitae.
//             </p>

//             <div className="hero-buttons">
//               <button className="btn primary">Get Started</button>
//               <button className="btn secondary">Read More</button>
//             </div>
//           </div>
//         </div>

//         <div className="hero-right">
//           <div className="first-block">
//             <img
//               src="/assets/images/hero/hero1.png"
//               alt="Model wearing t-shirt"
//               className="hero-img"
//             />
//             <div className="right-badge">
//               <h2>PRINT Products </h2>
//             </div>
//           </div>

//           <div className="last-block">
//             <img
//               src="/assets/images/hero/hero2.png"
//               alt="Model wearing t-shirt"
//               className="hero-img"
//             />
//             <div className="right-badge">
//               <h2>Business Card </h2>
//             </div>
//           </div>
//         </div>
//       </section>
//     </>
//   );
// }
