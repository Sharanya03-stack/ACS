"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Wrench, 
  BatteryCharging, 
  Car, 
  Settings,
  FileText,
  Calendar,
  CheckCircle,
  RotateCcw,
  UserCircle
} from 'lucide-react';
import { DashboardUser } from './DashboardClientWrapper';

type Role = string;

const NAVIGATION_ITEMS: Record<Role, { name: string; href: string; icon: any }[]> = {
  ACS_ADMIN: [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'OEMs', href: '/admin/oems', icon: Briefcase },
    { name: 'Dealerships', href: '/admin/dealerships', icon: Briefcase },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Vehicles', href: '/admin/vehicles', icon: Car },
    { name: 'Chargers', href: '/admin/chargers', icon: BatteryCharging },
    { name: 'Installations', href: '/admin/installations', icon: CheckCircle },
    { name: 'Partners', href: '/admin/partners', icon: Users },
    { name: 'Technicians', href: '/admin/technicians', icon: Wrench },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ],
  OEM: [
    { name: 'Dashboard', href: '/oem/dashboard', icon: LayoutDashboard },
    { name: 'Dealerships', href: '/oem/dealerships', icon: Briefcase },
    { name: 'Customers', href: '/oem/customers', icon: Users },
    { name: 'Vehicles', href: '/oem/vehicles', icon: Car },
    { name: 'Chargers', href: '/oem/chargers', icon: BatteryCharging },
    { name: 'Installations', href: '/oem/installations', icon: CheckCircle },
    { name: 'Settings', href: '/oem/settings', icon: Settings },
  ],
  DEALER: [
    { name: 'Dashboard', href: '/dealer/dashboard', icon: LayoutDashboard },
    { name: 'Vehicle Sales', href: '/dealer/sales', icon: Car },
    { name: 'Customers', href: '/dealer/customers', icon: Users },
    { name: 'Installation Requests', href: '/dealer/requests', icon: BatteryCharging },
    { name: 'Installations', href: '/dealer/installations', icon: CheckCircle },
    { name: 'Settings', href: '/dealer/settings', icon: Settings },
  ],
  PARTNER: [
    { name: 'Dashboard', href: '/partner/dashboard', icon: LayoutDashboard },
    { name: 'New Jobs', href: '/partner/new', icon: BatteryCharging },
    { name: 'Active Jobs', href: '/partner/active', icon: Wrench },
    { name: 'Scheduled', href: '/partner/scheduled', icon: Calendar },
    { name: 'Completed', href: '/partner/completed', icon: CheckCircle },
    { name: 'Revisits', href: '/partner/revisits', icon: RotateCcw },
    { name: 'Technicians', href: '/partner/technicians', icon: Users },
    { name: 'All Installations', href: '/partner/installations', icon: FileText },
    { name: 'Settings', href: '/partner/settings', icon: Settings },
  ],
  TECHNICIAN: [
    { name: 'Today\'s Jobs', href: '/technician/dashboard', icon: LayoutDashboard },
    { name: 'Upcoming Jobs', href: '/technician/upcoming', icon: Calendar },
    { name: 'Completed Jobs', href: '/technician/completed', icon: CheckCircle },
    { name: 'Profile', href: '/technician/profile', icon: UserCircle },
    { name: 'Settings', href: '/technician/settings', icon: Settings },
  ]
};

export function Sidebar({ user }: { user: DashboardUser }) {
  const pathname = usePathname();
  
  if (!user) return null;

  const navItems = NAVIGATION_ITEMS[user.role] || [];

  return (
    <div className="flex flex-col w-64 bg-[#0a0a0a] border-r border-[#1a1a1a] min-h-screen text-white">
      <div className="flex items-center justify-center h-16 border-b border-white/10">
        <Image src="/logo.png" alt="ACS ENERGY" width={160} height={45} className="object-contain" priority />
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <motion.div 
                  key={item.name} 
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                >
                  <Link
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all ${
                      isActive 
                        ? 'bg-white/10 text-accent scale-[1.02]' 
                        : 'text-gray-300 hover:bg-white/5 hover:text-white hover:scale-[1.02]'
                    }`}
                  >
                    <Icon className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${isActive ? 'text-accent' : 'text-gray-400 group-hover:text-gray-300'}`} />
                    {item.name}
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </nav>
      </div>
    </div>
  );
}
