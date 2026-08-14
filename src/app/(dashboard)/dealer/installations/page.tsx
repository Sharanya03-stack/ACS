"use client";

import React from 'react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth';
import { InstallationStatus } from '@/lib/types';
import Link from 'next/link';

export default function DealerInstallationsPage() {
  const { user } = useAuth();
  const { installations, customers, vehicles } = useData();

  // Filter installations for this dealer
  const dealerInstallations = installations.filter(i => i.dealerId === user?.roleId);

  const getStatusColor = (status: InstallationStatus) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'VERIFIED': return 'bg-emerald-100 text-emerald-800';
      case 'IN PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'UNDER VERIFICATION': return 'bg-yellow-100 text-yellow-800';
      case 'REVISIT REQUIRED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Installations</h1>
          <p className="mt-1 text-sm text-gray-500">Track the status of EV charger installations for your customers.</p>
        </div>
        <Link 
          href="/dealer/sales" 
          className="inline-flex justify-center rounded-md border border-transparent bg-acs-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-acs-primary/90"
        >
          + New Sale & Request
        </Link>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installation ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created On</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dealerInstallations.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  No installations found. Go to Sales to create a new request.
                </td>
              </tr>
            ) : (
              dealerInstallations.map((inst) => {
                const customer = customers.find(c => c.id === inst.customerId);
                const vehicle = vehicles.find(v => v.id === inst.vehicleId);

                return (
                  <tr key={inst.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inst.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer?.name}</div>
                      <div className="text-sm text-gray-500">{customer?.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle?.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(inst.status)}`}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(inst.dateCreated).toLocaleDateString()}
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
