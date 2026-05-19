


// import mongoose from "mongoose";

// const UserSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     companyName: { type: String },
//     gstNumber: { type: String },
//     businessAddress: { type: String },
//     phone: { type: String, required: true, unique: true },
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
//     userType: {
//       type: String,
//       enum: ["partner", "customer"],
//       required: true,
//     },

//     memberId: { type: String, unique: true, sparse: true },

//     isApproved: {
//       type: Boolean,
//       default: function () {
//         return this.userType === "partner" ? false : true;
//       },
//     },
//     resetPasswordToken: String,
//     resetPasswordExpires: Date,
//   },
//   { timestamps: true }
// );


// // ✅ ADD THIS BLOCK EXACTLY HERE 👇
// UserSchema.pre("save", async function (next) {
//   if (this.userType === "partner" && !this.memberId) {
//     const count = await mongoose.models.User.countDocuments({
//       userType: "partner",
//       memberId: { $exists: true },
//     });

//     // this.memberId = `PRT-${100000 + count + 1}`;
//     this.memberId = `OPS-${100000 + count + 1}`;

//   }
//   next();
// });


// // ✅ ENSURE GST IS UNIQUE FOR PARTNERS ONLY
// UserSchema.index(
//   { gstNumber: 1 },
//   {
//     unique: true,
//     partialFilterExpression: {
//       userType: "partner",
//       gstNumber: { $exists: true, $ne: "" },
//     },
//   }
// );


// export default mongoose.models.User || mongoose.model("User", UserSchema);









import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    companyName: { type: String },
    gstNumber: { type: String },
    businessAddress: { type: String },


        // ✅ NEW FIELDS
    city: { type: String },
    state: { type: String },
    pinCode: { type: String },


    
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userType: {
      type: String,
      enum: ["partner", "customer"],
      required: true,
    },

    memberId: { type: String, unique: true, sparse: true },

    isApproved: {
      type: Boolean,
      default: function () {
        return this.userType === "partner" ? false : true;
      },
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true }
);


// memberId is generated in signup.js handler to avoid Mongoose model cache issues.


// GST uniqueness is enforced at the application level (see signup.js check).
// Sparse index for query performance only — no unique constraint so null/missing
// gstNumber values don't conflict across customers and partners without GST.
UserSchema.index({ gstNumber: 1 }, { sparse: true });


export default mongoose.models.User || mongoose.model("User", UserSchema);
