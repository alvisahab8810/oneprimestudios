// import mongoose from "mongoose";

// const AdminSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
//     role: { type: String, default: "admin" },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.Admin || mongoose.model("Admin", AdminSchema);





import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    // 🔐 Password stays REQUIRED to avoid breaking current users
    password: {
      type: String,
      required: true,
    },

    // ✅ Role support (super admin remains valid)
    role: {
      type: String,
      enum: ["super_admin", "designer", "product_manager", "manager", "admin"],
      default: "super_admin", // IMPORTANT: keeps current flow safe
    },


    permissions: {
  type: [String],
  default: [], // empty = role-based defaults
},

    // ✅ For invite-based activation (used later)
    isActive: {
      type: Boolean,
      default: true, // existing admins remain active
    },

    inviteToken: {
      type: String,
      default: null,
    },

    inviteExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Admin ||
  mongoose.model("Admin", AdminSchema);
