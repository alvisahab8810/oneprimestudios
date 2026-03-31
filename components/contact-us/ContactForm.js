// import React from "react";
// // import "./ContactForm.css";

// const ContactForm = () => {
//   return (
//     <section className="contact-section">
//       <div className="contact-container">
//         {/* Left Info Section */}
//         <div className="contact-info">
//           <div className="mobile-none">
//               <h2>Let's talk with us</h2>
//           <p>
//             Questions, comments, or suggestions? <br />
//             Simply fill in the form and we'll be in touch shortly.
//           </p>
//           </div>

//           <div className="info-item">
//             <span className="icon">
//                 <img src="/assets/images/icons/location.svg" alt="location icon"></img>
//             </span>
//             <p>
//               591 eya/19, Raibareli Rd, Kumhar Mandi, Telibagh,
//               <br />
//               Lucknow, Uttar Pradesh 226029
//             </p>
//           </div>

//           <div className="info-item">
//             <span className="icon">
//                 <img src="/assets/images/icons/contact.svg" alt="contact icon"></img>
//             </span>
//             <p>+91 87370 38342</p>
//           </div>

//           <div className="info-item">
//              <span className="icon">
//                 <img src="/assets/images/icons/email.svg" alt="email icon"></img>
//             </span>
//             <p>Contact@oneprimestudios.in</p>
//           </div>


//           <div className="mobile-text-contact desktop-none">
//               <h2>Let's talk with us</h2>
//           <p>
//             Questions, comments, or suggestions? <br />
//             Simply fill in the form and we'll be in touch shortly.
//           </p>
//           </div>
//         </div>

//         {/* Right Form Section */}
//         <div className="contact-form">
//           <form>
//             <div className="form-row">
//               <input type="text" placeholder="First Name*" required />
//               <input type="text" placeholder="Last Name*" required />
//             </div>
//             <input type="email" placeholder="Email*" required />
//             <input type="tel" placeholder="Phone Number*" required />
//             <textarea placeholder="Your message..." rows="4"></textarea>
//             <button type="submit">Send Message</button>
//           </form>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default ContactForm;



import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const ContactForm = () => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("/api/contact", form);

      toast.success("Message sent successfully!");

      // Reset form
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <section className="contact-section">
      <div className="contact-container">
        {/* Left Info Section */}
        <div className="contact-info">
          <div className="mobile-none">
            <h2>Let's talk with us</h2>
            <p>
              Questions, comments, or suggestions? <br />
              Simply fill in the form and we'll be in touch shortly.
            </p>
          </div>

          <div className="info-item">
            <span className="icon">
              <img src="/assets/images/icons/location2.svg" alt="location icon" />
            </span>
            <p>
              591 eya/19, Raibareli Rd, Kumhar Mandi, Telibagh,
              <br />
              Lucknow, Uttar Pradesh 226029
            </p>
          </div>

          <div className="info-item">
            <span className="icon">
              <img src="/assets/images/icons/call2.svg" alt="contact icon" />
            </span>
            <div className="d-flex gap-2 flex-wrap">
              <p><a href="tel:+915224957479">+91 5224957479</a></p>
              <p><a href="tel:+918737038342">+91 8737038342</a></p>
              <p><a href="tel:+919454708850">+91 9454708850</a></p>
            </div>
          </div>

          <div className="info-item">
            <span className="icon">
              <img src="/assets/images/icons/email2.svg" alt="email icon" />
            </span>
            <p><a href="mailto:Sales1@oneprimestudios.com">Sales1@oneprimestudios.com</a></p>
          </div>

          <div className="mobile-text-contact desktop-none">
            <h2>Let's talk with us</h2>
            <p>
              Questions, comments, or suggestions? <br />
              Simply fill in the form and we'll be in touch shortly.
            </p>
          </div>
        </div>

        {/* Right Form Section */}
        <div className="contact-form">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <input
                type="text"
                name="firstName"
                placeholder="First Name*"
                value={form.firstName}
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last Name*"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email*"
              value={form.email}
              onChange={handleChange}
              required
            />

            <input
              type="tel"
              name="phone"
              placeholder="Phone Number*"
              value={form.phone}
              onChange={handleChange}
              required
            />

            <textarea
              name="message"
              placeholder="Your message..."
              value={form.message}
              onChange={handleChange}
              rows="4"
            />

            <button type="submit">Send Message</button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
