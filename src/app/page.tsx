"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    
    if (!user) {
      router.push("/login");
      return;
    }

    // Redirect based on role
    switch (user.role) {
      case "ACS_ADMIN":
        router.push("/admin/dashboard");
        break;
      case "OEM":
        router.push("/oem/dashboard");
        break;
      case "DEALER":
        router.push("/dealer/dashboard");
        break;
      case "PARTNER":
        router.push("/partner/dashboard");
        break;
      case "TECHNICIAN":
        router.push("/technician/dashboard");
        break;
      default:
        router.push("/login");
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="text-primary text-xl animate-pulse">Loading ACS Platform...</div>
    </div>
  );
}
