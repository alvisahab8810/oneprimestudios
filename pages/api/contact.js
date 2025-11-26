import dbConnect from "@/lib/dbConnect";
import ContactLead from "@/models/ContactLead";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { firstName, lastName, email, phone, message } = req.body;

    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({ message: "All required fields missing" });
    }

    const lead = await ContactLead.create({
      firstName,
      lastName,
      email,
      phone,
      message,
    });

    return res.status(201).json({ message: "Message sent successfully", lead });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
