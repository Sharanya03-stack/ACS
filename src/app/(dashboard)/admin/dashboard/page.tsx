import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { BatteryCharging } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch counts in parallel
  const [
    { count: totalOEMs },
    { count: totalDealerships },
    { count: totalPartners },
    { count: totalTechnicians },
    { count: totalVehicles },
    { count: totalChargers },
    { count: pendingInstallations },
    { count: completedInstallations },
    { count: revisitRequired },
    { count: underVerification }
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('type', 'OEM'),
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('type', 'DEALER'),
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('type', 'PARTNER'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'TECHNICIAN'),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }),
    supabase.from('chargers').select('*', { count: 'exact', head: true }),
    supabase.from('installations').select('*', { count: 'exact', head: true }).not('status', 'in', '("COMPLETED","VERIFIED","CANCELLED","FAILED")'),
    supabase.from('installations').select('*', { count: 'exact', head: true }).in('status', ['COMPLETED', 'VERIFIED']),
    supabase.from('installations').select('*', { count: 'exact', head: true }).eq('status', 'REVISIT_REQUIRED'),
    supabase.from('installations').select('*', { count: 'exact', head: true }).eq('status', 'UNDER_VERIFICATION'),
  ]);

  const metrics = {
    totalOEMs: totalOEMs || 0,
    totalDealerships: totalDealerships || 0,
    totalPartners: totalPartners || 0,
    totalTechnicians: totalTechnicians || 0,
    totalVehicles: totalVehicles || 0,
    totalChargers: totalChargers || 0,
    pendingInstallations: pendingInstallations || 0,
    completedInstallations: completedInstallations || 0,
    revisitRequired: revisitRequired || 0,
    underVerification: underVerification || 0,
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ACS Energy Operations</h1>
        <p className="mt-1 text-sm text-gray-500">Master Overview of all EV Charger Installations.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36]">
          <dt className="text-sm font-medium text-gray-500 truncate">Total OEMs</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={metrics.totalOEMs} /></dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36]">
          <dt className="text-sm font-medium text-gray-500 truncate">Total Dealerships</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={metrics.totalDealerships} /></dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36]">
          <dt className="text-sm font-medium text-gray-500 truncate">Installation Partners</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={metrics.totalPartners} /></dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36]">
          <dt className="text-sm font-medium text-gray-500 truncate">Active Technicians</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={metrics.totalTechnicians} /></dd>
        </div>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-4">Installation Pipeline</h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-gray-100 p-5 relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><BatteryCharging size={64}/></div>
          <dt className="text-sm font-medium text-gray-500 truncate">Pending Jobs</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={metrics.pendingInstallations} /></dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-yellow-200 p-5 bg-gradient-to-br from-yellow-50 to-white relative">
          <dt className="text-sm font-medium text-yellow-800 truncate">Needs Verification</dt>
          <dd className="mt-1 text-3xl font-semibold text-yellow-600"><AnimatedCounter value={metrics.underVerification} /></dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-green-200 p-5 bg-gradient-to-br from-green-50 to-white relative">
          <dt className="text-sm font-medium text-green-800 truncate">Completed & Verified</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600"><AnimatedCounter value={metrics.completedInstallations} /></dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-red-200 p-5 bg-gradient-to-br from-red-50 to-white relative">
          <dt className="text-sm font-medium text-red-800 truncate">Revisit Required</dt>
          <dd className="mt-1 text-3xl font-semibold text-red-600"><AnimatedCounter value={metrics.revisitRequired} /></dd>
        </div>
      </div>
    </div>
  );
}
