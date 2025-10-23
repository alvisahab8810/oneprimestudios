import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router"; // ✅ Add this

const AuthForm = () => {
  const router = useRouter(); // ✅
  const [isPartner, setIsPartner] = useState(true);
  const [isSignup, setIsSignup] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleTabClick = (isPartnerTab) => {
    setIsPartner(isPartnerTab);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();

  //   try {
  //     if (isSignup) {
  //       if (
  //         !formData.name ||
  //         !formData.phone ||
  //         !formData.email ||
  //         !formData.password ||
  //         !formData.confirmPassword ||
  //         (isPartner && !formData.companyName)
  //       ) {
  //         toast.error("Please fill in all required fields.");
  //         return;
  //       }
  //       if (formData.password !== formData.confirmPassword) {
  //         toast.error("Passwords do not match.");
  //         return;
  //       }
  //     } else {
  //       if (!formData.emailOrPhone || !formData.password) {
  //         toast.error("Email/Phone and Password are required.");
  //         return;
  //       }
  //     }

  //     const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";

  //     const payload = {
  //       ...formData,
  //       userType: isPartner ? "partner" : "customer",
  //     };

  //     if (!isSignup) {
  //       payload.emailOrPhone = formData.emailOrPhone;
  //       delete payload.email;
  //       delete payload.name;
  //       delete payload.companyName;
  //       delete payload.phone;
  //       delete payload.confirmPassword;
  //     }

  //     const res = await axios.post(endpoint, payload);

  //     toast.success(
  //       isSignup ? "Account created successfully!" : "Login successful 🎉"
  //     );

  //     // Save auth info
  //     localStorage.setItem("token", res.data.token);
  //     localStorage.setItem("userType", res.data.userType);
  //     localStorage.setItem("name", res.data.name);
  //     localStorage.setItem("email", res.data.email);

  //     // ✅ Redirect to homepage
  //     setTimeout(() => {
  //       router.push("/");
  //     }, 1500);
  //   } catch (err) {
  //     console.error("Auth error:", err.response?.data || err.message);
  //     toast.error(
  //       err.response?.data?.message || "Something went wrong, please try again."
  //     );
  //   }
  // };



const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    if (isSignup) {
      // Validation
      if (
        !formData.name ||
        !formData.phone ||
        !formData.email ||
        !formData.password ||
        !formData.confirmPassword ||
        (isPartner && !formData.companyName)
      ) {
        toast.error("Please fill in all required fields.");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
    } else {
      if (!formData.emailOrPhone || !formData.password) {
        toast.error("Email/Phone and Password are required.");
        return;
      }
    }

    const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";

    const payload = {
      ...formData,
      userType: isPartner ? "partner" : "customer",
    };

    if (!isSignup) {
      payload.emailOrPhone = formData.emailOrPhone;
      delete payload.email;
      delete payload.name;
      delete payload.companyName;
      delete payload.phone;
      delete payload.confirmPassword;
    }

    const res = await axios.post(endpoint, payload);

    // ✅ If partner signup, show pending approval message
    if (isSignup && isPartner) {
      toast.success(
        "Your signup was successful! Please wait for admin approval before logging in."
      );
      // Optional: clear form
      setFormData({
        name: "",
        companyName: "",
        phone: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
      return; // ❌ Prevent auto-login
    }

    // ✅ For customers or partner login after approval, continue normal flow
    toast.success(isSignup ? "Account created successfully!" : "Login successful 🎉");

    // Save auth info
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("userType", res.data.userType);
    localStorage.setItem("name", res.data.name);
    localStorage.setItem("email", res.data.email);

    // Redirect home
    setTimeout(() => {
      router.push("/");
    }, 1500);
  } catch (err) {
    console.error("Auth error:", err.response?.data || err.message);
    toast.error(
      err.response?.data?.message || "Something went wrong, please try again."
    );
  }
};

  return (
    <div className="auth-container">
      <div className="auth-image-section"></div>

      <div className="auth-form-section">
        <div className="logo">
          <img src="/assets/images/logo.png" alt="Logo" />
        </div>

        {/* Top Tabs */}
        <div className="toggle-buttons">
          <button
            className={isPartner ? "active" : ""}
            onClick={() => handleTabClick(true)}
          >
            {isSignup ? "Partner Signup" : "Partner Login"}
          </button>
          <button
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
                <input
                  type="text"
                  name="companyName"
                  placeholder="Company Name"
                  required
                  onChange={handleChange}
                />
              )}
              <input
                type="tel"
                name="phone"
                placeholder="Phone Number"
                required
                onChange={handleChange}
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                onChange={handleChange}
              />
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
            </>
          )}

          {/* LOGIN */}
          {!isSignup && (
            <>
              <input
                type="text"
                name="emailOrPhone" // 👈 change here
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
                  <input type="checkbox" />
                  Remember me
                </label>
                <a href="/forgot-password">Forgot password?</a>{" "}
                {/* ✅ link to page */}
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
