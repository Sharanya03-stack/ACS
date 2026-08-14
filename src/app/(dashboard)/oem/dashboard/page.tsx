"use client";

import React from 'react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth';

export default function OemDashboard() {
  const { user } = useAuth();
  const { installations, dealers, vehicles, chargers } = useData();

  // Filter data for this OEM
  const oemDealers = dealers.filter(d => d.oemId === user?.roleId);
  const oemVehicles = vehicles.filter(v => v.oemId === user?.roleId);
  const oemInstallations = installations.filter(i => i.oemId === user?.roleId);

  const metrics = {
    totalDealers: oemDealers.length,
    totalVehicles: oemVehicles.length,
    pendingInstallations: oemInstallations.filter(i => !['COMPLETED', 'VERIFIED', 'CANCELLED', 'FAILED'].includes(i.status)).length,
    completedInstallations: oemInstallations.filter(i => ['COMPLETED', 'VERIFIED'].includes(i.status)).length,
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">OEM Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Track EV sales and charger installation performance for your brand.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Associated Dealerships</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{metrics.totalDealers}</dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Total EV Sales</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{metrics.totalVehicles}</dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Pending Charger Installs</dt>
          <dd className="mt-1 text-3xl font-semibold text-acs-accent">{metrics.pendingInstallations}</dd>
        </div>
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <dt className="text-sm font-medium text-gray-500 truncate">Completed Installs</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600">{metrics.completedInstallations}</dd>
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
            {oemInstallations.slice(0, 10).map((inst) => {
              const vehicle = vehicles.find(v => v.id === inst.vehicleId);
              const dealer = dealers.find(d => d.id === inst.dealerId);

              return (
                <tr key={inst.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inst.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle?.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dealer?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {inst.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
