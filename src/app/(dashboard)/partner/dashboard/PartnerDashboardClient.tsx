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
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [selectedTechId, setSelectedTechId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewInstId, setReviewInstId] = useState<string | null>(null);

  const handleAssign = async () => {
    if (selectedJob && selectedTechId) {
      setIsSubmitting(true);
      setError(null);
      
      const res = await assignTechnicianAction(selectedJob.id, selectedTechId);
      
      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
      } else {
        setSelectedJob(null);
        setSelectedTechId("");
        setIsSubmitting(false);
      }
    }
  };

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
                  <tr key={inst.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inst.id}</td>
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
                        onClick={() => setSelectedJob(inst)}
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

      {/* Assignment Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedJob(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Assign Technician to {selectedJob.id}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 text-left mb-4">
                      Select an available technician to dispatch for this installation.
                    </p>
                    {error && (
                      <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 text-left">
                        {error}
                      </div>
                    )}
                    <select
                      value={selectedTechId}
                      onChange={(e) => setSelectedTechId(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-acs-primary focus:border-acs-primary sm:text-sm rounded-md border"
                    >
                      <option value="">Select a technician...</option>
                      {technicians.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={!selectedTechId || isSubmitting}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-acs-primary text-base font-medium text-white hover:bg-acs-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-acs-primary sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Assigning...' : 'Assign Job'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  disabled={isSubmitting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-acs-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
