import React from 'react';
import { createClient, getUserProfile } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getInstallations } from '@/utils/queries';
import { InstallationFilters } from '@/components/ui/InstallationFilters';
import { Pagination } from '@/components/ui/Pagination';
import Link from 'next/link';
import { AddOrderButton } from '@/components/installations/AddOrderButton';

export default async function OemDashboard({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();

  if (!profile || profile.role !== 'OEM') {
    redirect('/login');
  }

  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const dealer_id = typeof params.dealer_id === 'string' ? params.dealer_id : undefined;

  // 1. Fetch exactly what RLS allows us to see (no client filtering!)
  const [
    { count: totalDealers },
    { count: totalVehicles },
    { count: pendingInstallations },
    { count: completedInstallations },
    { data: recentInstallations, count: totalInstallations },
    { data: dealersData }
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
      
    getInstallations(supabase, { page, search, status, category, dealer_id, oem_id: profile.profile.org_id || undefined }),
    
    supabase.from('organizations').select('id, name').eq('type', 'DEALER')
  ]);

  const dealers = dealersData || [];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OEM Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Track EV sales and charger installation performance for your brand.</p>
        </div>
        <AddOrderButton />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link href="/oem/dealerships" className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group relative">
          <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-acs-primary transition-colors">Associated Dealerships</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalDealers || 0}</dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link href="/oem/vehicles" className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group relative">
          <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-acs-primary transition-colors">Total EV Sales</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalVehicles || 0}</dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link href="/oem/active" className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group relative">
          <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-acs-primary transition-colors">Pending Charger Installs</dt>
          <dd className="mt-1 text-3xl font-semibold text-acs-accent">{pendingInstallations || 0}</dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link href="/oem/completed" className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group relative">
          <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-acs-primary transition-colors">Completed Installs</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600">{completedInstallations || 0}</dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
      
      <InstallationFilters 
        showDealer={true}
        dealers={dealers}
      />
      
      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Installations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installation ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charger</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(!recentInstallations || recentInstallations.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No records found.
                  </td>
                </tr>
              ) : (
                recentInstallations.map((inst: any) => {
                  const vehicleModel = inst.vehicles?.model || 'Unknown';
                  const dealerName = inst.dealers?.name || 'Unknown';
    
                  return (
                    <tr key={inst.id} className="acs-table-row">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inst.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicleModel}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dealerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{inst.chargers?.serial_number || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{inst.chargers?.model}</div>
                      </td>
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
        <Pagination totalItems={totalInstallations || 0} />
      </div>
    </div>
  );
}
