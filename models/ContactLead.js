import mongoose from "mongoose";
import { LEAD_STATUSES, DEFAULT_LEAD_STATUS } from "@/config/leadStatuses";

const ContactLeadSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String },

    // Where the lead has reached. Leads saved before this existed carry no
    // value, so the default applies to them as well when they are read.
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: DEFAULT_LEAD_STATUS,
    },
    statusUpdatedAt: { type: Date },

    // Anything the team wants to remember about this enquiry
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.ContactLead ||
  mongoose.model("ContactLead", ContactLeadSchema);
