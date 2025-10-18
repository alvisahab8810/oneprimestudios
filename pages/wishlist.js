"use client";
import Footer from "@/components/footer/Footer";
import Topbar from "@/components/header/Topbar";
import React from "react";

export default function WishList() {
  return (
   <div>
    <div className="container">
          <Topbar/>
     <div className="cart-wip-page d-flex justify-content-center align-items-center">
      <div className="cart-wip-card text-center p-5 shadow-lg rounded-4">
        {/* Animated PNG Image */}
        <div className="wip-image mb-4">
          <img
            src="/assets/images/under.png" // <-- replace with your PNG illustration
            alt="Work in Progress"
          />
        </div>

        <h1 className="wip-title mb-3">Wishlist Page Under Development</h1>
        <p className="wip-text mb-0">
          We're working hard to bring you a fully functional Wishlist. Please check back soon!
        </p>
      </div>

      <style jsx>{`
        .cart-wip-page {
          min-height: 80vh;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          padding: 40px 20px;
          border-radius:10px;
          
        }

        .cart-wip-card {
          max-width: 500px;
          background: #ffffff;
          animation: fadeUp 1s ease-in-out;
          border-radius:10px
        }

        .wip-image img {
          width: 150px;
          animation: bounce 2s infinite;
        }

        .wip-title {
          font-size: 2rem;
          font-weight: 700;
          color: #343a40;
          animation: fadeIn 1s ease-in-out;
        }

        .wip-text {
          font-size: 1.1rem;
          color: #6c757d;
          animation: fadeIn 1.5s ease-in-out;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-15px);
          }
          60% {
            transform: translateY(-7px);
          }
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .wip-image img {
            width: 120px;
          }

          .wip-title {
            font-size: 1.6rem;
          }

          .wip-text {
            font-size: 1rem;
          }

          .cart-wip-card {
            padding: 30px 20px;
          }
        }
      `}</style>
    </div>
    </div>
    <Footer/>
   </div>
  );
}
