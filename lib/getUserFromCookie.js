// /lib/getUserFromToken.js
import jwt from "jsonwebtoken";
import User from "@/models/User";

export const getUserFromToken = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.split(" ")[1]; // "Bearer <token>"
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    return user;
  } catch (err) {
    console.error("Token error:", err.message);
    return null;
  }
};
