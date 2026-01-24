import { useEffect } from "react";
import { useRouter } from "next/router";
import toast from "react-hot-toast";

export default function InviteVerify() {
  const router = useRouter();
  const { token } = router.query;

  useEffect(() => {
    if (!token) return;

    const verifyInvite = async () => {
      try {
        const res = await fetch("/api/admin/verify-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Invalid invite");

        // ✅ invite verified → go to protected page
        router.replace("/admin/set-password");

      } catch (err) {
        toast.error(err.message || "Invite expired or invalid");
      }
    };

    verifyInvite();
  }, [token, router]);

  // no UI needed
  return null;
}
