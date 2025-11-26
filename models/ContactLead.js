import mongoose from "mongoose";

const ContactLeadSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.ContactLead ||
  mongoose.model("ContactLead", ContactLeadSchema);
