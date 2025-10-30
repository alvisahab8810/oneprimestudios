// import mongoose from "mongoose";

// const WishlistSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   items: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
// });

// export default mongoose.models.Wishlist ||
//   mongoose.model("Wishlist", WishlistSchema);





// // models/Wishlist.js
// import mongoose from "mongoose";

// const WishlistSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
//   items: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
// });

// export default mongoose.models.Wishlist || mongoose.model("Wishlist", WishlistSchema);



// models/Wishlist.js
import mongoose from "mongoose";

const WishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    },
  ],
});

export default mongoose.models.Wishlist || mongoose.model("Wishlist", WishlistSchema);
