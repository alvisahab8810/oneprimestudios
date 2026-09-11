import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
// import "swiper/css/navigation";

export default function Client() {
  const products = [
    {
      id: 1,
      img: "/assets/images/client/client1.png",
    },
    {
      id: 2,

      img: "/assets/images/client/client2.png",

    },
    {
      id: 3,

      img: "/assets/images/client/client3.png",

    },
    {
      id: 4,

      img: "/assets/images/client/client4.webp",

    },
    {
      id: 5,

      img: "/assets/images/client/client5.png",

    },


        {
      id: 6,

      img: "/assets/images/client/client6.png",

    },
    {
      id: 7,

      img: "/assets/images/client/client7.png",

    },
    {
      id: 8,

      img: "/assets/images/client/client8.jpg",

    },

     {
      id: 9,

      img: "/assets/images/client/client9.png",

    },

     {
      id: 10,

      img: "/assets/images/client/client10.png",

    },

     {
      id: 11,

      img: "/assets/images/client/logo11.png",

    },

    {
      id: 12,

      img: "/assets/images/client/client12.jpg",

    },
    {
      id: 13,

      img: "/assets/images/client/client13.png",

    },

    {
      id: 14,

      img: "/assets/images/client/client14.png",

    },


    {
      id: 15,

      img: "/assets/images/client/client15.png",

    },


    {
      id: 16,

      img: "/assets/images/client/client16.png",

    },
    
     {
      id: 17,

      img: "/assets/images/client/client17.png",

    },

     {
      id: 18,

      img: "/assets/images/client/client18.png",

    },
 {
      id: 19,

      img: "/assets/images/client/client19.png",

    },


     {
      id: 20,

      img: "/assets/images/client/client20.png",

    },

     {
      id: 21,

      img: "/assets/images/client/client21.png",

    },


     {
      id: 22,

      img: "/assets/images/client/client22.png",

    },

     {
      id: 23,

      img: "/assets/images/client/client23.png",

    },
  ];

  return (
    <section className="brands-section">
      <div className="container">
        <h2 className="brands-heading">
          Trusted By <span>Leading Brands</span>
        </h2>
      </div>

      <div className="brands-slider">
        <Swiper
          className="brands-swiper"
          modules={[Autoplay]}
          spaceBetween={24}
          slidesPerView={6}
          loop
          speed={3000}
          allowTouchMove={false}
          autoplay={{ delay: 0, disableOnInteraction: false }}
          breakpoints={{
            320: { slidesPerView: 3, spaceBetween: 16 },
            576: { slidesPerView: 4, spaceBetween: 18 },
            992: { slidesPerView: 5, spaceBetween: 20 },
            1200: { slidesPerView: 6, spaceBetween: 24 },
          }}
        >
          {products.map((product) => (
            <SwiperSlide key={product.id}>
              <div className="brand-logo">
                <img src={product.img} alt="Client logo" loading="lazy" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
