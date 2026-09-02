"use client";

import React, { useState } from 'react';
import { assignTechnicianAction } from './actions';
import { CustomerNameCell } from '@/components/customers/CustomerDetailsDrawer';
import { ReviewDrawer } from '@/components/installations/ReviewDrawer';
import { useRouter } from 'next/navigation';
import { InstallationFilters } from '@/components/ui/InstallationFilters';
import { Pagination } from '@/components/ui/Pagination';

export default function PartnerDashboardClient({ 
  installations, 
  totalCount,
  technicians 
}: { 
  installations: any[], 
  totalCount: number,
  technicians: any[] 
}) {
  const router = useRouter();
  const [reviewInstId, setReviewInstId] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800';
      case 'PARTNER_ASSIGNED': return 'bg-orange-100 text-orange-800';
      case 'TECHNICIAN_ASSIGNED': return 'bg-cyan-100 text-cyan-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'UNDER_VERIFICATION': return 'bg-yellow-100 text-yellow-800';
      case 'REVISIT_REQUIRED': return 'bg-red-100 text-red-800';
      case 'VERIFIED': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Partner Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your active installation jobs and technicians.</p>
      </div>

      <InstallationFilters 
        showTechnician={true}
        technicians={technicians}
      />

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Installation Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer / Location</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charger</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {installations.map((inst) => {
                const customer = inst.customers;
                const tech = inst.technicians;

                return (
                  <tr key={inst.id} className="acs-table-row">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inst.display_id || inst.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer ? (
                        <CustomerNameCell id={customer.id} name={`${customer.name || ''}`} city={`${customer.address}, ${customer.city}`} />
                      ) : (
                        <span className="text-gray-400 italic">Unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{inst.chargers?.serial_number || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{inst.chargers?.model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(inst.status)}`}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tech ? tech.name : <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {(!inst.technician_id || inst.status === 'NEW' || inst.status === 'PARTNER_ASSIGNED') && (
                      <button 
                        onClick={() => setReviewInstId(inst.id)}
                        className="text-acs-primary hover:text-acs-primary/80"
                      >
                        Assign Technician
                      </button>
                    )}
                    {(inst.status === 'UNDER_VERIFICATION') && (
                      <button 
                        onClick={() => setReviewInstId(inst.id)}
                        className="text-acs-primary hover:text-acs-primary/80 font-bold"
                      >
                        Review Installation
                      </button>
                    )}
                    {(['VERIFIED', 'COMPLETED', 'REVISIT_REQUIRED'].includes(inst.status)) && (
                      <button 
                        onClick={() => setReviewInstId(inst.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {installations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                  No installations assigned to your organization.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination totalItems={totalCount} />
      </div>

      <ReviewDrawer 
        installationId={reviewInstId} 
        onClose={() => setReviewInstId(null)}
        onReviewComplete={() => {
          setReviewInstId(null);
          router.refresh();
        }}
      />

    </div>
  );
}
