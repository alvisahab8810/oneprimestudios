import Footer from "@/components/footer/Footer";
import Topbar from "@/components/header/Topbar";
import Categories from "@/components/home-page/Categories";
import Client from "@/components/home-page/Client";
import DealBanner from "@/components/home-page/Cta";
import FaqAccordion from "@/components/home-page/Faq";
import Features from "@/components/home-page/Features";
import GoogleReviews from "@/components/home-page/GoogleReviews";
import HeroSection from "@/components/home-page/HeroSection";
import ProductSlider from "@/components/home-page/ProductSlider";
import axios from "axios";
import { useState, useEffect } from "react";

import Head from "next/head";
import HeroSectionMobile from "@/components/home-page/HeroSectionMobile.";
import MobileFeatures from "@/components/home-page/MobileFeatures";
import Offcanvas from "@/components/header/Offcanvas";

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const userType = localStorage.getItem("userType"); // 👈 get from login
    let url = "/api/products";
    if (userType) url += `?userType=${userType}`;

    axios.get(url).then((res) => setProducts(res.data));
  }, []);
  return (
    <>
      <Head>
        <title>One Prime Studios</title>
        <meta name="description" content="One Prime Studios" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/assets/images/logo.png" />
      </Head>
      <div className="main-page">
        <Topbar />
        <Offcanvas/>
        <HeroSection />
        <div className="container">
          <HeroSectionMobile/>
          <Features />
          <MobileFeatures/>
        </div>
        <Categories />
        <GoogleReviews />
        <ProductSlider />
        <Client />
        {/* <ProductSlider /> */}
        <div className="container">
          <DealBanner />
          <FaqAccordion />
        </div>
        <Footer />
      </div>
    </>
  );
}
