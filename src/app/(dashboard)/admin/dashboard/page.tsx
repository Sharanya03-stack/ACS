"use client";

import React from 'react';
import { useData } from '@/lib/data-context';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { BatteryCharging } from 'lucide-react';

export default function AdminDashboard() {
  const { installations, oems, dealers, partners, technicians, vehicles, chargers } = useData();

  const metrics = {
    totalOEMs: oems.length,
    totalDealerships: dealers.length,
    totalPartners: partners.length,
    totalTechnicians: technicians.length,
    totalVehicles: vehicles.length,
    totalChargers: chargers.length,
    pendingInstallations: installations.filter(i => !['COMPLETED', 'VERIFIED', 'CANCELLED', 'FAILED'].includes(i.status)).length,
    completedInstallations: installations.filter(i => ['COMPLETED', 'VERIFIED'].includes(i.status)).length,
    revisitRequired: installations.filter(i => i.status === 'REVISIT REQUIRED').length,
    underVerification: installations.filter(i => i.status === 'UNDER VERIFICATION').length,
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900">ACS Energy Operations</h1>
        <p className="mt-1 text-sm text-gray-500">Master Overview of all EV Charger Installations.</p>
      </motion.div>

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36]">
          <dt className="text-sm font-medium text-gray-500 truncate">Total OEMs</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={metrics.totalOEMs} /></dd>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36]">
          <dt className="text-sm font-medium text-gray-500 truncate">Total Dealerships</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={metrics.totalDealerships} /></dd>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36]">
          <dt className="text-sm font-medium text-gray-500 truncate">Installation Partners</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={metrics.totalPartners} /></dd>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36]">
          <dt className="text-sm font-medium text-gray-500 truncate">Active Technicians</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={metrics.totalTechnicians} /></dd>
        </motion.div>
      </motion.div>

      <motion.h2 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-lg font-bold text-gray-900 mb-4"
      >
        Installation Pipeline
      </motion.h2>

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
        }}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-gray-100 p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><BatteryCharging size={64}/></div>
          <dt className="text-sm font-medium text-gray-500 truncate">Pending Jobs</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={metrics.pendingInstallations} /></dd>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-yellow-200 p-5 bg-gradient-to-br from-yellow-50 to-white relative overflow-hidden">
          <dt className="text-sm font-medium text-yellow-800 truncate">Needs Verification</dt>
          <dd className="mt-1 text-3xl font-semibold text-yellow-600"><AnimatedCounter value={metrics.underVerification} /></dd>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-green-200 p-5 bg-gradient-to-br from-green-50 to-white relative overflow-hidden">
          <dt className="text-sm font-medium text-green-800 truncate">Completed & Verified</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600"><AnimatedCounter value={metrics.completedInstallations} /></dd>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-red-200 p-5 bg-gradient-to-br from-red-50 to-white relative overflow-hidden">
          <dt className="text-sm font-medium text-red-800 truncate">Revisit Required</dt>
          <dd className="mt-1 text-3xl font-semibold text-red-600"><AnimatedCounter value={metrics.revisitRequired} /></dd>
        </motion.div>
      </motion.div>
    </div>
  );
}
