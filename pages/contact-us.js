import ContactForm from '@/components/contact-us/ContactForm'
import Footer from '@/components/footer/Footer'
import Offcanvas from '@/components/header/Offcanvas'
import Topbar from '@/components/header/Topbar'
import FaqAccordion from '@/components/home-page/Faq'
import React from 'react'

export default function contactUs() {
  return (
    <div className='contact-us-area'>
        <Topbar/>
        <Offcanvas/>
    
        <div className='contact-hero'>
            <img src='/assets/images/contact-hero.webp' alt='contact-hero'></img>
        </div>
        <div className='container'>
        <ContactForm/>
        <FaqAccordion/>

        </div>
        <Footer/>
    </div>
  )
}
