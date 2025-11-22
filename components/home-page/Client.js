import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
// import "swiper/css/navigation";

export default function Client() {
  const products = [
    {
      id: 1,
      img: "/assets/images/client/logo.png",
    },
    {
      id: 2,

      img: "/assets/images/client/logo2.png",

    },
    {
      id: 3,

      img: "/assets/images/client/logo3.png",

    },
    {
      id: 4,

      img: "/assets/images/client/logo4.png",

    },
    {
      id: 5,

      img: "/assets/images/client/logo5.png",

    },


        {
      id: 6,

      img: "/assets/images/client/logo6.png",

    },
    {
      id: 7,

      img: "/assets/images/client/logo7.png",

    },
    {
      id: 8,

      img: "/assets/images/client/logo8.png",

    },



    



  ];

  return (


    <>

    <div className="container ">
      <div className="categories-header">
          <h3 className="categories-title">Our Happy Clients</h3>

          {/* <Link href="/categories" className="view-all-link">
            View All <img src="/assets/images/icons/arrow.svg" />
          </Link> */}
        </div>

        <div className="underline"></div>
    </div>
    <div className="client-slider">
      
      

      <Swiper
      className="happy-client"
        modules={[Navigation]}
        spaceBetween={20}

        slidesPerView={7}
        // navigation
        breakpoints={{
          320: { slidesPerView: 4 ,
             spaceBetween: 10,


          },
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 7 },
        }}
      >
        {products.map((product) => (
          <SwiperSlide key={product.id}>
            <div className="client-card">
              {/* <div className="price-tag">{product.price}</div> */}
              <img src={product.img} alt={product.title} />
              {/* <div className="title">{product.title}</div> */}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
    </>
  );
}
