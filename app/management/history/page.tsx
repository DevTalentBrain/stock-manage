"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import parseClient from "@/lib/parse-client";
import HistoryView from "@/lib/history-view";

export default function ManagementHistoryPage() {
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const user = parseClient.User.current();
    if (
      !user ||
      (user.get("role") !== "manager" && user.get("username") !== "manager")
    ) {
      router.push("/management/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <HistoryView dashboardHref="/management/dashboard" />;
}
