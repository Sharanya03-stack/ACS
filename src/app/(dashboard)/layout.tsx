"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { motion } from "framer-motion";
import Image from "next/image";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
        return;
      }

      // Strict Role Isolation Guard
      const pathSegments = pathname.split('/').filter(Boolean);
      const rolePrefix = pathSegments[0]; // e.g., 'admin', 'technician'
      
      const roleMap: Record<string, string> = {
        'ACS_ADMIN': 'admin',
        'OEM': 'oem',
        'DEALER': 'dealer',
        'PARTNER': 'partner',
        'TECHNICIAN': 'technician'
      };

      const expectedPrefix = roleMap[user.role];
      if (rolePrefix && expectedPrefix && rolePrefix !== expectedPrefix) {
        // Unauthorized access, redirect to their correct dashboard
        router.push(`/${expectedPrefix}/dashboard`);
        setIsAuthorized(false);
      } else {
        setIsAuthorized(true);
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user || !isAuthorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F5F3ED]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#243B36]/20 border-t-[#243B36] animate-spin mb-4"></div>
          <div className="text-[#243B36] font-medium tracking-wide">
            {(!user && !isLoading) ? 'Redirecting to login...' : !isAuthorized ? 'Verifying access...' : 'Loading ACS Dashboard...'}
          </div>
        </div>
      </div>
    );
  }

  const getBackgroundImage = () => {
    if (pathname.includes('/reports')) return '/images/reports-bg.jpg';
    
    switch (user?.role) {
      case 'ACS_ADMIN': return '/images/admin-bg.jpg';
      case 'OEM': return '/images/oem-bg.jpg';
      case 'DEALER': return '/images/dealer-bg.jpg';
      case 'TECHNICIAN': 
      case 'PARTNER': return '/images/tech-bg.jpg';
      default: return null;
    }
  };

  const bgImage = getBackgroundImage();

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3ED] relative">
      {/* Dynamic Background Image */}
      {bgImage && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <Image 
            src={bgImage}
            alt="Dashboard Background"
            fill
            className="object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#F5F3ED]/70 via-[#F5F3ED]/85 to-[#F5F3ED]/95"></div>
        </div>
      )}

      {/* Main Layout Content */}
      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 relative">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full relative z-20"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
