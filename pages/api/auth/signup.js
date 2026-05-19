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

    // Generate memberId here (not in pre-save hook) to avoid Mongoose model cache issues.
    // Find the actual highest memberId in DB and increment — avoids gaps from deleted users.
    let memberId;
    if (userType === "partner") {
      const last = await User.findOne(
        { memberId: { $regex: /^OPS-/ } },
        { memberId: 1 }
      ).sort({ memberId: -1 }).lean();

      let nextNum = 100001;
      if (last?.memberId) {
        const parsed = parseInt(last.memberId.replace("OPS-", ""), 10);
        if (!isNaN(parsed)) nextNum = parsed + 1;
      }
      memberId = `OPS-${nextNum}`;
    }

    const user = await User.create({
      name,
      companyName: userType === "partner" ? companyName : undefined,
      gstNumber: userType === "partner" ? gstNumber : undefined,
      businessAddress: userType === "partner" ? businessAddress : undefined,
      city: userType === "partner" ? city : undefined,
      state: userType === "partner" ? state : undefined,
      pinCode: userType === "partner" ? pinCode : undefined,
      memberId,
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
    console.error("Signup error:", err);

    // Duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      const labels = { email: "Email", phone: "Phone number", gstNumber: "GST number", memberId: "Member ID" };
      return res.status(400).json({ message: `${labels[field] || field} already registered` });
    }

    // Mongoose validation error
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors).map(e => e.message).join(", ");
      return res.status(400).json({ message: msg });
    }

    res.status(500).json({ message: "Server error. Please try again." });
  }
}
