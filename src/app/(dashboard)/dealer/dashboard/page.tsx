import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function DealerDashboard() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // The RLS policies ensure the dealer can only see their own installations and vehicles.
  // We can just query without client-side filters.
  
  // 1. Total EV Sales (count vehicles)
  const { count: totalSales } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true });

  // 2. Pending Installations
  const { count: pendingInstallations } = await supabase
    .from('installations')
    .select('*', { count: 'exact', head: true })
    .not('status', 'in', '("COMPLETED","VERIFIED","CANCELLED","FAILED")');

  // 3. Completed Installations
  const { count: completedInstallations } = await supabase
    .from('installations')
    .select('*', { count: 'exact', head: true })
    .in('status', ['COMPLETED', 'VERIFIED']);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dealer Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back. Here's an overview of your EV sales and charger installations.</p>
        </div>
        <Link 
          href="/dealer/sales" 
          className="inline-flex justify-center rounded-md border border-transparent bg-acs-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-acs-primary/90"
        >
          + New Vehicle Sale
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Total EV Sales</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalSales || 0}</dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Pending Installations</dt>
          <dd className="mt-1 text-3xl font-semibold text-acs-accent">{pendingInstallations || 0}</dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Completed Installations</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600">{completedInstallations || 0}</dd>
        </div>
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
