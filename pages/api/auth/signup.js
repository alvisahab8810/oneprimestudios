// import dbConnect from "@/lib/dbConnect";
// import User from "@/models/User";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   await dbConnect();

//   try {
//     const {
//       name,
//       companyName,
//       phone,
//       email,
//       password,
//       confirmPassword,
//       userType,
//       gstNumber,
//       businessAddress,
//     } = req.body;

//     if (
//       !name ||
//       !phone ||
//       !email ||
//       !password ||
//       !confirmPassword ||
//       !userType
//     ) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     if (userType === "partner") {
//       if (!companyName || !gstNumber || !businessAddress) {
//         return res
//           .status(400)
//           .json({
//             message:
//               "GST Number, Address, and Company Name are required for partners",
//           });
//       }
//     }

//     if (password !== confirmPassword) {
//       return res.status(400).json({ message: "Passwords do not match" });
//     }

//     const existingUser = await User.findOne({
//       $or: [{ email }, { phone }],
//     });

//     if (existingUser) {
//       return res.status(400).json({
//         message:
//           existingUser.email === email
//             ? "Email already registered"
//             : "Phone number already registered",
//       });
//     }

//     // ✅ CHECK DUPLICATE GST FOR PARTNER
//     if (userType === "partner" && gstNumber) {
//       const existingGstUser = await User.findOne({
//         gstNumber: gstNumber,
//         userType: "partner",
//       });

//       if (existingGstUser) {
//         return res.status(400).json({
//           message: "GST number already registered",
//         });
//       }
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await User.create({
//       name,
//       companyName: userType === "partner" ? companyName : undefined,
//       gstNumber: userType === "partner" ? gstNumber : undefined,
//       businessAddress: userType === "partner" ? businessAddress : undefined,
//       phone,
//       email,
//       password: hashedPassword,
//       userType,
//       isApproved: userType === "partner" ? false : true,
//     });

//     const token = jwt.sign(
//       { id: user._id, userType: user.userType },
//       process.env.JWT_SECRET
//     );

//     res.status(201).json({
//       token,
//       userType: user.userType,
//       name: user.name,
//       email: user.email,
//       isApproved: user.isApproved,
//     });
//   } catch (err) {
//     console.error("Signup error:", err.message);
//     res.status(500).json({ message: "Server error" });
//   }
// }





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
    const {
      name,
      companyName,
      phone,
      email,
      password,
      confirmPassword,
      userType,
      gstNumber,
      businessAddress,
      
      // ✅ NEW
      city,
      state,
      pinCode,
    } = req.body;

    if (
      !name ||
      !phone ||
      !email ||
      !password ||
      !confirmPassword ||
      !userType
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

   if (userType === "partner") {
  if (
    !companyName ||
    !businessAddress ||
    !city ||
    !state ||
    !pinCode
  ) {
    return res.status(400).json({
      message:
        "Company name, address, city, state, and pin code are required for partners",
    });
  }
}

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          existingUser.email === email
            ? "Email already registered"
            : "Phone number already registered",
      });
    }

    // ✅ CHECK DUPLICATE GST FOR PARTNER
    if (userType === "partner" && gstNumber) {
      const existingGstUser = await User.findOne({
        gstNumber: gstNumber,
        userType: "partner",
      });

      if (existingGstUser) {
        return res.status(400).json({
          message: "GST number already registered",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      companyName: userType === "partner" ? companyName : undefined,
      gstNumber: userType === "partner" ? gstNumber : undefined,
      businessAddress: userType === "partner" ? businessAddress : undefined,

      // ✅ NEW
  city: userType === "partner" ? city : undefined,
  state: userType === "partner" ? state : undefined,
  pinCode: userType === "partner" ? pinCode : undefined,


      
      phone,
      email,
      password: hashedPassword,
      userType,
      isApproved: userType === "partner" ? false : true,
    });

    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET
    );

    res.status(201).json({
      token,
      userType: user.userType,
      name: user.name,
      email: user.email,
      isApproved: user.isApproved,
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}
