import React from 'react';
import { createClient, getUserProfile } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function OemDashboard() {
  const supabase = await createClient();
  const profile = await getUserProfile();

  if (!profile || profile.role !== 'OEM') {
    redirect('/login');
  }

  // 1. Fetch exactly what RLS allows us to see (no client filtering!)
  const [
    { count: totalDealers },
    { count: totalVehicles },
    { count: pendingInstallations },
    { count: completedInstallations },
    { data: recentInstallations }
  ] = await Promise.all([
    supabase.from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'DEALER'),
      
    supabase.from('vehicles')
      .select('*', { count: 'exact', head: true }),
      
    supabase.from('installations')
      .select('*', { count: 'exact', head: true })
      .in('status', ['NEW', 'PARTNER_ASSIGNED', 'TECHNICIAN_ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'UNDER_VERIFICATION', 'ON_HOLD', 'RESCHEDULED', 'REVISIT_REQUIRED']),
      
    supabase.from('installations')
      .select('*', { count: 'exact', head: true })
      .in('status', ['COMPLETED', 'VERIFIED']),
      
    supabase.from('installations')
      .select('id, status, vehicles(model), organizations!installations_dealer_id_fkey(name)')
      .order('created_at', { ascending: false })
      .limit(10)
  ]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">OEM Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Track EV sales and charger installation performance for your brand.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Associated Dealerships</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalDealers || 0}</dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Total EV Sales</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalVehicles || 0}</dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Pending Charger Installs</dt>
          <dd className="mt-1 text-3xl font-semibold text-acs-accent">{pendingInstallations || 0}</dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Completed Installs</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600">{completedInstallations || 0}</dd>
        </div>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Recent Installations</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-white">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installation ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(!recentInstallations || recentInstallations.length === 0) ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                  No records found.
                </td>
              </tr>
            ) : (
              recentInstallations.map((inst: any) => {
                const vehicleModel = inst.vehicles?.model || 'Unknown';
                const dealerName = inst.organizations?.name || 'Unknown';
  
                return (
                  <tr key={inst.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inst.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicleModel}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dealerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {inst.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
