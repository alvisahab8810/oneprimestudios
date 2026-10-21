// pages/api/admin/users/[id]/index.js
// Super admin manages one OPS staff account: suspend or restore access,
// change the role (PATCH), or remove the account entirely (DELETE).
import dbConnect from "@/lib/dbConnect";
import mongoose from "mongoose";
import Admin from "@/models/Admin";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { logActivity } from "@/lib/logActivity";

const ROLES = ["designer", "product_manager", "manager", "finance"];

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "PATCH" && req.method !== "DELETE") {
    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const me = await requireSuperAdmin(req, res);
  if (!me) return;

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    return res.status(400).json({ message: "Invalid user" });
  }

  // Locking or demoting your own account would lock you out of this screen
  if (String(id) === String(me.id)) {
    return res.status(400).json({ message: "You cannot change your own account here" });
  }

  try {
    const user = await Admin.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.method === "DELETE") {
      if (user.role === "super_admin" || user.role === "admin") {
        return res.status(403).json({ message: "A super admin account cannot be deleted" });
      }

      await Admin.deleteOne({ _id: user._id });

      logActivity(req, "ops_user_deleted", `OPS user "${user.name}" (${user.email}) was removed`, {
        entity: "admin",
        entityId: user._id,
        meta: { email: user.email, role: user.role },
      });

      return res.json({ success: true, message: "User deleted" });
    }

    if (user.role === "super_admin" || user.role === "admin") {
      return res.status(403).json({ message: "A super admin account cannot be changed here" });
    }

    const updates = {};
    const notes = [];

    if (typeof req.body?.isActive === "boolean") {
      // An account that never set a password cannot be switched on by hand
      if (req.body.isActive && user.password === "INVITED_USER") {
        return res.status(400).json({
          message: "This user has not set a password yet. Send an invite instead.",
        });
      }
      updates.isActive = req.body.isActive;
      notes.push(req.body.isActive ? "access restored" : "access suspended");
    }

    if (req.body?.role) {
      if (!ROLES.includes(req.body.role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      updates.role = req.body.role;
      notes.push(`role changed to ${req.body.role.replace("_", " ")}`);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    await Admin.updateOne({ _id: user._id }, { $set: updates });

    logActivity(req, "ops_user_updated", `OPS user "${user.name}" — ${notes.join(", ")}`, {
      entity: "admin",
      entityId: user._id,
      meta: { email: user.email, ...updates },
    });

    return res.json({ success: true, updates, message: `Updated — ${notes.join(", ")}` });
  } catch (err) {
    console.error("Update OPS user error:", err);
    return res.status(500).json({ message: "Could not update this user" });
  }
}
