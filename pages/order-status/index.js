// Anyone landing on /order-status goes to the stage board, which is the
// screen that shows everything at once.
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function OrderStatusIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/order-status/stage");
  }, [router]);
  return null;
}
