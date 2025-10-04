// import { Swiper, SwiperSlide } from "swiper/react";
// import { Navigation } from "swiper/modules";
// import "swiper/css";
// // import "swiper/css/navigation";

// export default function ProductSlider() {
//   const products = [
//     {
//       id: 1,
//       title: "Men's Polo T-Shirts",
//       price: "BUY 1 @ Rs.550",
//       img: "/assets/images/products/mens-photo.png",
//     },
//     {
//       id: 2,
//       title: "Standard Visiting Cards",
//       price: "BUY 100 @ Rs.200",
//       img: "/assets/images/products/standar-card.png",

//     },
//     {
//       id: 3,
//       title: "Hoodies",
//       price: "BUY 1 @ Rs.550",
//       img: "/assets/images/products/hoodies.png",

//     },
//     {
//       id: 4,
//       title: "Self inking stamps",
//       price: "BUY 1 @ Rs.290",
//       img: "/assets/images/products/self.png",

//     },
//     {
//       id: 5,
//       title: "Men’s T-shirts",
//       price: "BUY 1 @ Rs.450",
//       img: "/assets/images/products/mens-photo.png",

//     },


//     {
//       id: 1,
//       title: "Men's Polo T-Shirts",
//       price: "BUY 1 @ Rs.550",
//       img: "/assets/images/products/mens-photo.png",
//     },
//     {
//       id: 2,
//       title: "Standard Visiting Cards",
//       price: "BUY 100 @ Rs.200",
//       img: "/assets/images/products/standar-card.png",

//     },
//     {
//       id: 3,
//       title: "Hoodies",
//       price: "BUY 1 @ Rs.550",
//       img: "/assets/images/products/hoodies.png",

//     },
//     {
//       id: 4,
//       title: "Self inking stamps",
//       price: "BUY 1 @ Rs.290",
//       img: "/assets/images/products/self.png",

//     },
//     {
//       id: 5,
//       title: "Men’s T-shirts",
//       price: "BUY 1 @ Rs.450",
//       img: "/assets/images/products/mens-photo.png",

//     },
//   ];

//   return (
//     <div className="product-slider">
//       <h2>Our Most popular Products</h2>

//       <Swiper
//         modules={[Navigation]}
//         spaceBetween={20}
//         grabCursor={true}

//         slidesPerView={4.3}
//         // navigation
//         breakpoints={{
//           320: { slidesPerView: 1 },
//           640: { slidesPerView: 2 },
//           1024: { slidesPerView: 4.3 },
//         }}
//       >
//         {products.map((product) => (
//           <SwiperSlide key={product.id}>
//             <div className="product-card">
//               <div className="price-tag">{product.price}</div>
//               <img src={product.img} alt={product.title} />
//               <div className="title">{product.title}</div>
//             </div>
//           </SwiperSlide>
//         ))}
//       </Swiper>
//     </div>
//   );
// }










// components/ProductSlider.js
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import Link from "next/link"; // ✅ import
import "swiper/css";
import axios from "axios";

export default function ProductSlider() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const savedUserType = localStorage.getItem("userType");
  let url = "/api/products";

  if (!savedUserType) {
    // Non-login users: fetch only B2C products
    url += "?userType=customer";
  } else {
    // Logged-in users: fetch based on their type
    url += `?userType=${savedUserType}`;
  }

  axios
    .get(url)
    .then((res) => setProducts(res.data))
    .catch((err) => {
      console.error("Error fetching products:", err);
    })
    .finally(() => setLoading(false));
}, []);

  // useEffect(() => {
  //   const savedUserType = localStorage.getItem("userType");
  //   if (!savedUserType) {
  //     setLoading(false);
  //     return;
  //   }

  //   axios
  //     .get(`/api/products?userType=${savedUserType}`)
  //     .then((res) => {
  //       setProducts(res.data);
  //     })
  //     .catch((err) => {
  //       console.error("Error fetching products:", err);
  //     })
  //     .finally(() => setLoading(false));
  // }, []);

  if (loading) {
    return (
      <div className="product-slider">
        <h2>Our Most popular Products</h2>
        <p>Loading products...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="product-slider">
        <h2>Our Most popular Products</h2>
        <p>No products found for your account type.</p>
      </div>
    );
  }

  return (
    <div className="product-slider">
      <h2>Our Most popular Products</h2>

      <Swiper
        modules={[Navigation]}
        spaceBetween={20}
        grabCursor={true}
        slidesPerView={4.3}
        breakpoints={{
          320: { slidesPerView: 1 },
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 4.3 },
        }}
      >
        {products.map((product) => (
          <SwiperSlide key={product._id}>
            {/* <Link href={`/products/${product._id}`} passHref> */}

            <Link href={`/products/${product.slug}`} passHref>
              <div className="product-card cursor-pointer">
                <div className="price-tag">
                  {product.salePrice
                    ? `₹${product.salePrice}`
                    : `₹${product.basePrice}`}
                </div>
                <img
                  src={
                    product.mainImage ||
                    "/assets/images/products/placeholder.png"
                  }
                  alt={product.name}
                />
                <div className="title">{product.name}</div>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
