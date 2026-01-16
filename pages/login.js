

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";

const AuthForm = () => {
  const router = useRouter();
  const [isPartner, setIsPartner] = useState(true);
  const [isSignup, setIsSignup] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    gstNumber: "",
    businessAddress: "",

      // ✅ NEW
  city: "",
  state: "",
  pinCode: "",
    emailOrPhone: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleTabClick = (isPartnerTab) => setIsPartner(isPartnerTab);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      let payload = {};

      if (isSignup) {
        // 🔹 Destructure and trim
        const {
          name,
          companyName,
          phone,
          email,
          password,
          confirmPassword,
          gstNumber,
          businessAddress,
        } = formData;

        // 🔹 Basic field check
        if (
          !name?.trim() ||
          !phone?.trim() ||
          !email?.trim() ||
          !password?.trim() ||
          !confirmPassword?.trim()
        ) {
          toast.error("Please fill in all required fields.");
          return;
        }

        // 🔹 Partner extra field check
        if (isPartner) {
          if (
            !companyName?.trim() ||
            // !gstNumber?.trim() ||   Now Gst Optional
            !businessAddress?.trim() ||
             !formData.city?.trim() ||
    !formData.state?.trim() ||
    !formData.pinCode?.trim()
            
          ) {
            toast.error("Please enter company details, GST, and address.");
            return;
          }
        }

        // 🔹 Password match check
        if (password !== confirmPassword) {
          toast.error("Passwords do not match.");
          return;
        }

        // 🔹 Build payload
        payload = {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          userType: isPartner ? "partner" : "customer",
        };

        if (isPartner) {
          payload.companyName = companyName.trim();
          // payload.gstNumber = gstNumber.trim();

          if (gstNumber?.trim()) {
  payload.gstNumber = gstNumber.trim();
}


          payload.businessAddress = businessAddress.trim();

            // ✅ NEW
  payload.city = formData.city.trim();
  payload.state = formData.state.trim();
  payload.pinCode = formData.pinCode.trim();
        }
      } else {
        // 🔹 LOGIN validation
        if (!formData.emailOrPhone?.trim() || !formData.password?.trim()) {
          toast.error("Email/Phone and Password are required.");
          return;
        }

        payload = {
          emailOrPhone: formData.emailOrPhone.trim(),
          password: formData.password,
          userType: isPartner ? "partner" : "customer",
        };
      }

      // 🔹 Send request
      const res = await axios.post(endpoint, payload);

      // 🔹 Handle partner signup pending approval
      if (isSignup && isPartner) {
        toast.success(
          "Signup successful! Please wait for admin approval before logging in."
        );
        setTimeout(() => router.push("/"), 1500);
        setFormData({
          name: "",
          companyName: "",
          phone: "",
          email: "",
          password: "",
          confirmPassword: "",
          gstNumber: "",
          businessAddress: "",

           city: "",
  state: "",
  pinCode: "",
          emailOrPhone: "",
        });
        return;
      }

      // 🔹 Success
      toast.success(
        isSignup ? "Account created successfully!" : "Login successful 🎉"
      );

      // 🔹 Store and redirect
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userType", res.data.userType);
      localStorage.setItem("name", res.data.name);
      localStorage.setItem("email", res.data.email);

      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      console.error("Auth error:", err.response?.data || err.message);
      toast.error(
        err.response?.data?.message || "Something went wrong, please try again."
      );
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-image-section mobile-none"></div>

      <div className="auth-form-section">
        <div className="logo">
          <img src="/assets/images/logo.png" alt="Logo" />
        </div>

        {/* Top Tabs */}
        <div className="toggle-buttons">
          <button
            type="button"
            className={isPartner ? "active" : ""}
            onClick={() => handleTabClick(true)}
          >
            {isSignup ? "Partner Signup" : "Partner Login"}
          </button>
          <button
            type="button"
            className={!isPartner ? "active" : ""}
            onClick={() => handleTabClick(false)}
          >
            {isSignup ? "Customer Signup" : "Customer Login"}
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* SIGNUP */}
          {isSignup && (
            <>
              <h3 className="form-heading">
                {isPartner
                  ? "Enter Your Business Details"
                  : "Enter Your Details"}
              </h3>

              <input
                type="text"
                name="name"
                placeholder="Your Name"
                required
                onChange={handleChange}
              />

              {isPartner && (
                <>
                  <input
                    type="text"
                    name="companyName"
                    placeholder="Company Name"
                    required
                    onChange={handleChange}
                  />

                  <input
                    type="text"
                    name="gstNumber"
                    placeholder="GST Number"
                    // required
                    onChange={handleChange}
                  />

                  <textarea
                    name="businessAddress"
                    placeholder="Business Address"
                    required
                    rows={3}
                    onChange={handleChange}
                    style={{ resize: "none" }}
                  />


                   {/* ✅ NEW FIELDS */}

              <div className="form-row">

    <input
      type="text"
      name="city"
      placeholder="City"
      required
      onChange={handleChange}
    />

    <input
      type="text"
      name="state"
      placeholder="State"
      required
      onChange={handleChange}
    />
</div>
    <input
      type="text"
      name="pinCode"
      placeholder="Pin Code"
      maxLength={6}
      required
      onChange={handleChange}
    />
                </>
              )}

              <div className="form-row">


              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                required
                maxLength={10}
                onChange={handleChange}
              />
              
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                onChange={handleChange}
              />

              </div>

              <div className="form-row">
                <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  required
                  onChange={handleChange}
                />
                <span
                  className="eye-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </span>
              </div>

              <div className="password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  required
                  onChange={handleChange}
                />
                <span
                  className="eye-icon"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <FontAwesomeIcon
                    icon={showConfirmPassword ? faEyeSlash : faEye}
                  />
                </span>
              </div>
              </div>
            </>
          )}

          {/* LOGIN */}
          {!isSignup && (
            <>
              <input
                type="text"
                name="emailOrPhone"
                placeholder="Email or phone number"
                required
                onChange={handleChange}
              />

              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter password"
                  required
                  onChange={handleChange}
                />
                <span
                  className="eye-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </span>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" /> Remember me
                </label>
                <a href="/forgot-password">Forgot password?</a>
              </div>
            </>
          )}

          <button type="submit" className="sign-button">
            {isSignup ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p className="signup-toggle">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <span onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? "Sign in now" : "Sign up now"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
