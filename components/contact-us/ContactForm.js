import React from "react";
// import "./ContactForm.css";

const ContactForm = () => {
  return (
    <section className="contact-section">
      <div className="contact-container">
        {/* Left Info Section */}
        <div className="contact-info">
          <h2>Let's talk with us</h2>
          <p>
            Questions, comments, or suggestions? <br />
            Simply fill in the form and we'll be in touch shortly.
          </p>

          <div className="info-item">
            <span className="icon">
                <img src="/assets/images/icons/location.svg" alt="location icon"></img>
            </span>
            <p>
              591 eya/19, Raibareli Rd, Kumhar Mandi, Telibagh,
              <br />
              Lucknow, Uttar Pradesh 226029
            </p>
          </div>

          <div className="info-item">
            <span className="icon">
                <img src="/assets/images/icons/contact.svg" alt="contact icon"></img>
            </span>
            <p>+91 87370 38342</p>
          </div>

          <div className="info-item">
             <span className="icon">
                <img src="/assets/images/icons/email.svg" alt="email icon"></img>
            </span>
            <p>Contact@oneprimestudios.in</p>
          </div>
        </div>

        {/* Right Form Section */}
        <div className="contact-form">
          <form>
            <div className="form-row">
              <input type="text" placeholder="First Name*" required />
              <input type="text" placeholder="Last Name*" required />
            </div>
            <input type="email" placeholder="Email*" required />
            <input type="tel" placeholder="Phone Number*" required />
            <textarea placeholder="Your message..." rows="4"></textarea>
            <button type="submit">Send Message</button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
