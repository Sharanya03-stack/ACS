"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Installation, Customer } from '@/lib/types';
import Image from 'next/image';
import { BatteryCharging } from 'lucide-react';

interface Props {
  initialInstallations: any[];
  customers: any[];
  dealers: any[];
  partners: any[];
  technicians: any[];
}

export function AdminInstallationsClient({ initialInstallations, customers, dealers, partners, technicians }: Props) {
  const router = useRouter();
  const supabase = createClient();
  
  const [selectedInst, setSelectedInst] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800';
      case 'PARTNER_ASSIGNED': return 'bg-orange-100 text-orange-800';
      case 'TECHNICIAN_ASSIGNED': return 'bg-cyan-100 text-cyan-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'VERIFIED': return 'bg-emerald-100 text-emerald-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'UNDER_VERIFICATION': return 'bg-yellow-100 text-yellow-800 border-yellow-300 border-2';
      case 'REVISIT_REQUIRED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const verifyInstallation = async (id: string) => {
    const { error } = await supabase.from('installations').update({ status: 'VERIFIED' }).eq('id', id);
    if (!error) {
      router.refresh();
      setSelectedInst(null);
    } else {
      alert("Failed to verify: " + error.message);
    }
  };

  const rejectInstallation = async (id: string, reason: string) => {
    const { error } = await supabase.from('installations').update({ 
      status: 'REVISIT_REQUIRED', 
      rejection_reason: reason 
    }).eq('id', id);
    if (!error) {
      router.refresh();
      setSelectedInst(null);
    } else {
      alert("Failed to reject: " + error.message);
    }
  };

  const assignPartner = async (id: string, partnerId: string) => {
    const { error } = await supabase.from('installations').update({ 
      status: 'PARTNER_ASSIGNED', 
      partner_id: partnerId 
    }).eq('id', id);
    if (!error) {
      router.refresh();
      setSelectedInst(null);
    } else {
      alert("Failed to assign partner: " + error.message);
    }
  };

  const customer = customers.find(c => c.id === selectedInst?.customer_id);
  const dealer = dealers.find(d => d.id === selectedInst?.dealer_id);
  const partner = partners.find(p => p.id === selectedInst?.partner_id);
  const technician = technicians.find(t => t.id === selectedInst?.technician_id);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative">
      
      {/* Subtle Visual Header */}
      <div className="mb-8 relative rounded-2xl overflow-hidden shadow-sm border border-gray-200/50 bg-white">
        <div className="absolute inset-0 z-0">
          <Image 
            src="/images/tech-bg.jpg"
            alt="Installation Management"
            fill
            className="object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent"></div>
        </div>
        
        <div className="relative z-10 p-8">
          <h1 className="text-2xl font-bold text-gray-900">Installation Management</h1>
          <p className="mt-2 text-sm text-gray-600 max-w-xl">Master view of all EV charger installations across the network. Review, dispatch, and verify installations to ensure quality and compliance.</p>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installation ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {initialInstallations.map((inst) => {
              const c = customers.find(x => x.id === inst.customer_id);
              const d = dealers.find(x => x.id === inst.dealer_id);
              const p = partners.find(x => x.id === inst.partner_id);

              return (
                <tr key={inst.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedInst(inst)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inst.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{c?.name}</div>
                    <div className="text-sm text-gray-500">{c?.city}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p?.name || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(inst.status)}`}>
                      {inst.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-acs-primary hover:text-acs-primary/80">View Details</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {initialInstallations.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No records found.
          </div>
        )}
      </div>

      {/* Side Drawer */}
      {selectedInst && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setSelectedInst(null)} />
            <section className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
              <div className="w-screen max-w-2xl">
                <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
                  <div className="px-4 py-6 bg-gray-50 border-b sm:px-6 flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">Installation Details</h2>
                      <p className="text-sm text-gray-500">{selectedInst.id}</p>
                    </div>
                    <button onClick={() => setSelectedInst(null)} className="text-gray-400 hover:text-gray-500">
                      <span className="sr-only">Close panel</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="relative flex-1 px-4 py-6 sm:px-6 space-y-6">
                    
                    {/* Status Banner */}
                    <div className={`p-4 rounded-md flex justify-between items-center ${getStatusColor(selectedInst.status)}`}>
                      <span className="font-bold">Current Status: {selectedInst.status}</span>
                    </div>

                    {/* Verification Actions */}
                    {selectedInst.status === 'UNDER_VERIFICATION' && (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <h3 className="font-bold text-yellow-800 mb-2">Verification Required</h3>
                        <p className="text-sm text-yellow-700 mb-4">Please review the checklist and photos uploaded by the technician. If everything is correct, verify the installation.</p>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => { 
                              if(window.confirm('Are you sure you want to verify and complete this installation?')) {
                                verifyInstallation(selectedInst.id); 
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded whitespace-nowrap"
                          >
                            Approve & Verify
                          </button>
                          <div className="flex-1 flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Reason for rejection" 
                              className="flex-1 rounded-md border-gray-300 border px-3 text-sm"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                            />
                            <button 
                              onClick={() => { 
                                if(!rejectReason) {
                                  alert("Please provide a reason for rejection.");
                                  return;
                                }
                                if(window.confirm('Are you sure you want to reject this installation? The technician will be notified to revisit.')) {
                                  rejectInstallation(selectedInst.id, rejectReason); 
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Assign Partner */}
                    {selectedInst.status === 'NEW' && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h3 className="font-bold text-blue-800 mb-2">Assign Installation Partner</h3>
                        <div className="flex gap-2">
                          <select 
                            value={selectedPartnerId}
                            onChange={(e) => setSelectedPartnerId(e.target.value)}
                            className="flex-1 rounded-md border-gray-300 border px-3 text-sm py-2"
                          >
                            <option value="">Select a partner...</option>
                            {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.metadata?.serviceRegions?.join(', ')})</option>)}
                          </select>
                          <button 
                            onClick={() => {
                              if (selectedPartnerId) { assignPartner(selectedInst.id, selectedPartnerId); }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded whitespace-nowrap"
                          >
                            Dispatch Job
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Customer</h3>
                        <p className="mt-1 text-sm text-gray-900 font-semibold">{customer?.name}</p>
                        <p className="text-sm text-gray-500">{customer?.phone}</p>
                        <p className="text-sm text-gray-500">{customer?.address}, {customer?.city}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Dealer</h3>
                        <p className="mt-1 text-sm text-gray-900">{dealer?.name}</p>
                        <p className="text-sm text-gray-500">{dealer?.metadata?.city}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Partner & Technician</h3>
                        <p className="mt-1 text-sm text-gray-900">{partner?.name || 'Unassigned'}</p>
                        <p className="text-sm text-gray-500">{technician?.name || 'Unassigned'}</p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mt-8 border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-6">Installation Timeline</h3>
                      <div className="relative border-l-2 border-gray-200 ml-3 space-y-8">
                        {/* 1. Request Created */}
                        <div className="relative pl-6">
                          <span className="absolute -left-2.5 top-1 h-5 w-5 rounded-full border-2 border-white bg-green-500"></span>
                          <h4 className="text-sm font-semibold text-gray-900">Request Created</h4>
                          <p className="text-xs text-gray-500">{new Date(selectedInst.created_at).toLocaleDateString()}</p>
                        </div>
                        
                        {/* 2. Partner Assigned */}
                        <div className={`relative pl-6 ${selectedInst.status !== 'NEW' ? 'opacity-100' : 'opacity-40'}`}>
                          <span className={`absolute -left-2.5 top-1 h-5 w-5 rounded-full border-2 border-white ${selectedInst.status !== 'NEW' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <h4 className="text-sm font-semibold text-gray-900">Partner Assigned</h4>
                          {selectedInst.partner_id && <p className="text-xs text-gray-500">{partner?.name}</p>}
                        </div>

                        {/* 3. Tech Assigned */}
                        <div className={`relative pl-6 ${['TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'UNDER_VERIFICATION', 'REVISIT_REQUIRED', 'VERIFIED', 'COMPLETED'].includes(selectedInst.status) ? 'opacity-100' : 'opacity-40'}`}>
                          <span className={`absolute -left-2.5 top-1 h-5 w-5 rounded-full border-2 border-white ${['TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'UNDER_VERIFICATION', 'REVISIT_REQUIRED', 'VERIFIED', 'COMPLETED'].includes(selectedInst.status) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <h4 className="text-sm font-semibold text-gray-900">Technician Assigned</h4>
                          {selectedInst.technician_id && <p className="text-xs text-gray-500">{technician?.name}</p>}
                        </div>

                        {/* 4. Installation Submitted */}
                        <div className={`relative pl-6 ${['UNDER_VERIFICATION', 'REVISIT_REQUIRED', 'VERIFIED', 'COMPLETED'].includes(selectedInst.status) ? 'opacity-100' : 'opacity-40'}`}>
                          <span className={`absolute -left-2.5 top-1 h-5 w-5 rounded-full border-2 border-white ${['UNDER_VERIFICATION', 'REVISIT_REQUIRED', 'VERIFIED', 'COMPLETED'].includes(selectedInst.status) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <h4 className="text-sm font-semibold text-gray-900">Installation Submitted</h4>
                          {selectedInst.completed_at && <p className="text-xs text-gray-500">{new Date(selectedInst.completed_at).toLocaleDateString()}</p>}
                        </div>

                        {/* 5. Verified */}
                        <div className={`relative pl-6 ${['VERIFIED', 'COMPLETED'].includes(selectedInst.status) ? 'opacity-100' : 'opacity-40'}`}>
                          <span className={`absolute -left-2.5 top-1 h-5 w-5 rounded-full border-2 border-white ${['VERIFIED', 'COMPLETED'].includes(selectedInst.status) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <h4 className="text-sm font-semibold text-gray-900">ACS Verified</h4>
                        </div>
                      </div>
                    </div>

                    {/* Technician Checklist & Photos from mock removed as these are now in a separate table, but we can query them later in another phase */}
                    {selectedInst.rejection_reason && (
                       <div className="mt-8 border-t pt-6">
                          <h3 className="text-lg font-medium text-red-600 mb-2">Rejection Reason</h3>
                          <p className="text-sm text-gray-900">{selectedInst.rejection_reason}</p>
                       </div>
                    )}

                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
