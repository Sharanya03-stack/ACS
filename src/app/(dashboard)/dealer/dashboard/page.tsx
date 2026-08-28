import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { AddOrderButton } from '@/components/installations/AddOrderButton';

export default async function DealerDashboard() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // The RLS policies ensure the dealer can only see their own installations and vehicles.
  // We can just query without client-side filters.
  
  // Fetch counts in parallel
  const [
    { count: totalSales },
    { count: pendingInstallations },
    { count: completedInstallations }
  ] = await Promise.all([
    supabase.from('vehicles').select('*', { count: 'exact', head: true }),
    supabase.from('installations').select('*', { count: 'exact', head: true }).not('status', 'in', '("COMPLETED","VERIFIED","CANCELLED","FAILED")'),
    supabase.from('installations').select('*', { count: 'exact', head: true }).in('status', ['COMPLETED', 'VERIFIED'])
  ]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dealer Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back. Here's an overview of your EV sales and charger installations.</p>
        </div>
        <div className="flex gap-3">
          <Link 
            href="/dealer/sales" 
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            + New Vehicle Sale
          </Link>
          <AddOrderButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <Link href="/dealer/vehicles" className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200 p-5 group relative block">
          <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-acs-primary transition-colors">Total EV Sales</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalSales || 0}</dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link href="/dealer/active" className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200 p-5 group relative block">
          <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-acs-primary transition-colors">Pending Installations</dt>
          <dd className="mt-1 text-3xl font-semibold text-acs-accent">{pendingInstallations || 0}</dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link href="/dealer/completed" className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow rounded-lg border border-gray-200 p-5 group relative block">
          <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-acs-primary transition-colors">Completed Installations</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600">{completedInstallations || 0}</dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>
      
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dealer/installations" className="block p-4 border rounded-lg hover:border-acs-primary transition-colors">
            <h3 className="font-semibold text-gray-900">Track Installations →</h3>
            <p className="text-sm text-gray-500 mt-1">View the real-time status of all your customer's home charging setups.</p>
          </Link>
          <Link href="/dealer/sales" className="block p-4 border rounded-lg hover:border-acs-primary transition-colors">
            <h3 className="font-semibold text-gray-900">Register New Sale →</h3>
            <p className="text-sm text-gray-500 mt-1">Log a new vehicle delivery and trigger the home charger installation process.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
