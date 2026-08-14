"use client";

import React from 'react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function DealerDashboard() {
  const { user } = useAuth();
  const { installations, vehicles, chargers } = useData();

  // Filter data for this dealer
  const dealerInstallations = installations.filter(i => i.dealerId === user?.roleId);
  const dealerVehicles = vehicles.filter(v => v.dealerId === user?.roleId);
  const dealerChargers = chargers.filter(c => installations.some(i => i.chargerId === c.id && i.dealerId === user?.roleId));

  const metrics = {
    totalSales: dealerVehicles.length,
    pendingInstallations: dealerInstallations.filter(i => !['COMPLETED', 'VERIFIED', 'CANCELLED', 'FAILED'].includes(i.status)).length,
    completedInstallations: dealerInstallations.filter(i => ['COMPLETED', 'VERIFIED'].includes(i.status)).length,
  };

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
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{metrics.totalSales}</dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Pending Installations</dt>
          <dd className="mt-1 text-3xl font-semibold text-acs-accent">{metrics.pendingInstallations}</dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Completed Installations</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600">{metrics.completedInstallations}</dd>
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
