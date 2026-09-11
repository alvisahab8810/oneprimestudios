// lib/dbConnect.js
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI missing in .env.local");
}

// Dev me Next har file change par modules reload karta hai. Agar cache sirf
// module-level variable me rakhein to har reload nayi connection banata hai
// aur purana flag "connected" pada reh jata hai -> queries buffer hoke
// "buffering timed out after 10000ms" de deti hain. Isliye cache global par.
let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

export default async function dbConnect() {
  // 1 = connected. Isi ko sach maano, apne banaye flag ko nahi.
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // connect in-flight hai to usi promise ka intezaar karo — parallel requests
  // milkar 10-15 connections na khol dein.
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGO_URI, {
        bufferCommands: false, // connection nahi hai to fail karo, chupke se buffer mat karo
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      })
      .then((m) => {
        console.log("✅ MongoDB connected");
        return m;
      })
      .catch((err) => {
        // fail hua to promise cache saaf karo warna har agli request
        // isi toote hue promise par atak jayegi.
        cached.promise = null;
        console.error("❌ MongoDB connection error:", err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
