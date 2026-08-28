"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { motion } from "framer-motion";
import Image from "next/image";

export interface DashboardUser {
  id: string;
  name: string;
  role: string;
  roleId: string;
}

export function DashboardClientWrapper({
  user,
  children,
}: {
  user: DashboardUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();



  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3ED] relative">
      {/* Main Layout Content */}
      <div className="relative z-10 flex h-full w-full">
        <Sidebar user={user} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header user={user} />
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
