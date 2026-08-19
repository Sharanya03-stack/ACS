"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Bell, User, LogOut, ChevronDown, Settings } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { DashboardUser } from './DashboardClientWrapper';

export function Header({ user }: { user: DashboardUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getPageTitle = () => {
    if (pathname.includes('/dashboard')) return 'Dashboard';
    if (pathname.includes('/oems')) return 'OEMs';
    if (pathname.includes('/dealerships')) return 'Dealerships';
    if (pathname.includes('/partners')) return 'Partners';
    if (pathname.includes('/technicians')) return 'Technicians';
    if (pathname.includes('/installations')) return 'Installations';
    if (pathname.includes('/vehicles')) return 'Vehicles';
    if (pathname.includes('/settings')) return 'Settings';
    if (pathname.includes('/customers')) return 'Customers';
    if (pathname.includes('/sales')) return 'Sales';
    if (pathname.includes('/requests')) return 'Requests';
    if (pathname.includes('/jobs')) return 'Jobs';
    if (pathname.includes('/scheduled')) return 'Scheduled';
    if (pathname.includes('/completed')) return 'Completed';
    if (pathname.includes('/revisits')) return 'Revisits';
    if (pathname.includes('/reports')) return 'Reports';
    if (pathname.includes('/upcoming')) return 'Upcoming Jobs';
    if (pathname.includes('/profile')) return 'Profile';
    return 'ACS Platform';
  };

  const getRoleLabel = (role?: string) => {
    switch(role) {
      case 'ACS_ADMIN': return 'ACS Admin';
      case 'OEM': return 'OEM';
      case 'DEALER': return 'Dealer';
      case 'PARTNER': return 'Installation Partner';
      case 'TECHNICIAN': return 'Technician';
      default: return 'User';
    }
  };

  const rolePrefix = pathname.split('/')[1] || '';

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-xl font-semibold text-primary">{getPageTitle()}</h1>
      <div className="flex items-center space-x-4">
        <button className="text-gray-500 hover:text-gray-700 relative p-2 transition-transform hover:scale-110">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>
        <div className="border-l border-gray-200 h-8 mx-2"></div>
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-3 focus:outline-none hover:bg-gray-50 p-1.5 rounded-md transition-colors"
          >
            <div className="bg-[#243B36]/10 p-2 rounded-full text-[#243B36]">
              <User className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start hidden sm:flex">
              <span className="text-sm font-semibold text-gray-900 leading-tight">{user?.name}</span>
              <div className="flex items-center text-xs text-gray-500 mt-0.5 space-x-1">
                <span>{getRoleLabel(user?.role)}</span>
                <span>•</span>
                <span className="font-mono">{user?.id}</span>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl py-1 bg-white ring-1 ring-black/5 focus:outline-none z-50 border border-gray-100 origin-top-right"
              >
                <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{getRoleLabel(user?.role)}</p>
                </div>
                <Link href={`/${rolePrefix}/profile`} onClick={() => setDropdownOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                  <User className="h-4 w-4 mr-2 text-gray-400" /> Profile
                </Link>
                <Link href={`/${rolePrefix}/settings`} onClick={() => setDropdownOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors">
                  <Settings className="h-4 w-4 mr-2 text-gray-400" /> Settings
                </Link>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center border-t border-gray-100 mt-1 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2 text-red-500" /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
