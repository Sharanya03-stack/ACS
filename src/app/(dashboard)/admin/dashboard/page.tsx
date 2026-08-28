import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { BatteryCharging } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { InteractiveMetricCards } from '@/components/admin/InteractiveMetricCards';
import { AddOrderButton } from '@/components/installations/AddOrderButton';
import Link from 'next/link';

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Fetch counts and actual list data in parallel
  const [
    { data: oems },
    { data: dealerships },
    { data: partners },
    { data: technicians },
    { count: totalVehicles },
    { count: totalChargers },
    { count: pendingInstallations },
    { count: completedInstallations },
    { count: revisitRequired },
    { count: underVerification }
  ] = await Promise.all([
    supabase.from('organizations').select('id, name, status, contact_email, contact_phone').eq('type', 'OEM'),
    supabase.from('organizations').select('id, name, status, contact_email, contact_phone, parent_org:organizations!parent_org_id(name)').eq('type', 'DEALER'),
    supabase.from('organizations').select('id, name, status, contact_email, contact_phone, address').eq('type', 'PARTNER'),
    supabase.from('profiles').select('id, name, status, phone, address, organization:organizations!org_id(name)').eq('role', 'TECHNICIAN'),
    supabase.from('vehicles').select('*', { count: 'exact', head: true }),
    supabase.from('chargers').select('*', { count: 'exact', head: true }),
    supabase.from('installations').select('*', { count: 'exact', head: true }).not('status', 'in', '("COMPLETED","VERIFIED","CANCELLED","FAILED")'),
    supabase.from('installations').select('*', { count: 'exact', head: true }).in('status', ['COMPLETED', 'VERIFIED']),
    supabase.from('installations').select('*', { count: 'exact', head: true }).eq('status', 'REVISIT_REQUIRED'),
    supabase.from('installations').select('*', { count: 'exact', head: true }).eq('status', 'UNDER_VERIFICATION'),
  ]);

  const metrics = {
    totalVehicles: totalVehicles || 0,
    totalChargers: totalChargers || 0,
    pendingInstallations: pendingInstallations || 0,
    completedInstallations: completedInstallations || 0,
    revisitRequired: revisitRequired || 0,
    underVerification: underVerification || 0,
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ACS Energy Operations</h1>
          <p className="mt-1 text-sm text-gray-500">Master Overview of all EV Charger Installations.</p>
        </div>
        <AddOrderButton />
      </div>

      <InteractiveMetricCards 
        oems={oems || []}
        dealerships={dealerships || []}
        partners={partners || []}
        technicians={technicians || []}
      />

      <h2 className="text-lg font-bold text-gray-900 mb-4">Installation Pipeline</h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/requests" className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-gray-100 p-5 relative group block">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><BatteryCharging size={64}/></div>
          <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-acs-primary transition-colors">Pending Jobs</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={metrics.pendingInstallations} /></dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link href="/admin/completed" className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-yellow-200 p-5 bg-gradient-to-br from-yellow-50 to-white relative group block">
          <dt className="text-sm font-medium text-yellow-800 truncate group-hover:text-yellow-900 transition-colors">Needs Verification</dt>
          <dd className="mt-1 text-3xl font-semibold text-yellow-600"><AnimatedCounter value={metrics.underVerification} /></dd>
          <div className="absolute top-5 right-5 text-yellow-400 group-hover:text-yellow-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link href="/admin/completed" className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-green-200 p-5 bg-gradient-to-br from-green-50 to-white relative group block">
          <dt className="text-sm font-medium text-green-800 truncate group-hover:text-green-900 transition-colors">Completed & Verified</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600"><AnimatedCounter value={metrics.completedInstallations} /></dd>
          <div className="absolute top-5 right-5 text-green-400 group-hover:text-green-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link href="/admin/revisits" className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-red-200 p-5 bg-gradient-to-br from-red-50 to-white relative group block">
          <dt className="text-sm font-medium text-red-800 truncate group-hover:text-red-900 transition-colors">Revisit Required</dt>
          <dd className="mt-1 text-3xl font-semibold text-red-600"><AnimatedCounter value={metrics.revisitRequired} /></dd>
          <div className="absolute top-5 right-5 text-red-400 group-hover:text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}
