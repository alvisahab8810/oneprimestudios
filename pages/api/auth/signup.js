// pages/api/auth/signup.js
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await dbConnect();

  try {
    const { name, companyName, phone, email, password, confirmPassword, userType } = req.body;

    if (!name || !phone || !email || !password || !confirmPassword || !userType) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // const existingUser = await User.findOne({ email });
    // if (existingUser) {
    //   return res.status(400).json({ message: "Email already registered" });
    // }


    const existingUser = await User.findOne({
            $or: [{ email }, { phone }]
            });

            if (existingUser) {
            return res.status(400).json({
                message: existingUser.email === email
                ? "Email already registered"
                : "Phone number already registered"
            });
            }


    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      companyName: userType === "partner" ? companyName : undefined,
      phone,
      email,
      password: hashedPassword,
      userType,
    });

    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
    //   { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      userType: user.userType,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}
