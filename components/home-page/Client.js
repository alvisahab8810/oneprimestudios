import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay} from "swiper/modules";
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
        modules={[Navigation, Autoplay]}
        spaceBetween={20}

          autoplay={{
                      delay: 2500,
                      disableOnInteraction: false,
                    }}

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
