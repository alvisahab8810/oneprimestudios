// lib/dbConnect.js
import mongoose from "mongoose";

let isConnected = false; // Track connection

export default async function dbConnect() {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    isConnected = conn.connections[0].readyState;
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw new Error("MongoDB connection failed");
  }
}
