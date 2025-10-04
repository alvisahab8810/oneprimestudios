// models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    companyName: { type: String }, // only for partners
    // phone: { type: String, required: true },
     phone: { type: String, required: true, unique: true },  // 👈 unique
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userType: {
      type: String,
      enum: ["partner", "customer"],
      required: true,
    },

      resetPasswordToken: String,
  resetPasswordExpires: Date,
  },
  { timestamps: true }
);

// Avoid recompiling model in dev
export default mongoose.models.User || mongoose.model("User", UserSchema);
