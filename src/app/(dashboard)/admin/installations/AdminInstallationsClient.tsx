"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignPartnerAction } from '@/app/actions/assignPartner';
import { createClient } from '@/utils/supabase/client';
import { Installation, Customer } from '@/lib/types';
import { reviewInstallation } from '@/app/actions/reviewInstallation';
import Image from 'next/image';
import { EvidenceManager } from '@/components/installations/EvidenceManager';
import { BatteryCharging, Filter, ChevronLeft, ChevronRight, X, User } from 'lucide-react';
import { InstallationFilters } from '@/components/ui/InstallationFilters';
import { Pagination } from '@/components/ui/Pagination';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  initialInstallations: any[];
  totalCount: number;
  oems: any[];
  dealers: any[];
  partners: any[];
  technicians: any[];
}

import { AddOrderButton } from '@/components/installations/AddOrderButton';

export function AdminInstallationsClient({ initialInstallations, totalCount, oems, dealers, partners, technicians }: Props) {
  const router = useRouter();
  const supabase = createClient();
  
  const [selectedInst, setSelectedInst] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  
  // New state for Review Workflow
  const [checklists, setChecklists] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (selectedInst) {
      loadDetails(selectedInst.id);
      document.body.style.overflow = 'hidden';
    } else {
      setChecklists([]);
      setPhotos([]);
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedInst]);

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const panelVariants: any = {
    hidden: { opacity: 0, scale: 0.97, y: 15 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300, duration: 0.3 } },
    exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.2, ease: "easeOut" } }
  };

  const [events, setEvents] = useState<any[]>([]);

  const loadDetails = async (id: string) => {
    setIsLoadingDetails(true);

    // Fetch audit logs for timeline
    const { data: eventData } = await supabase
      .from('audit_logs')
      .select(`
        *,
        actor:profiles!user_id (name, role)
      `)
      .eq('entity_type', 'INSTALLATION')
      .eq('entity_id', id)
      .order('created_at', { ascending: true });
      
    if (eventData) {
      setEvents(eventData);
    }

    // Fetch checklists
    const { data: checklistData } = await supabase
      .from('installation_checklists')
      .select('*')
      .eq('installation_id', id);
    if (checklistData) setChecklists(checklistData);

    // Fetch photos metadata
    const { data: photoData } = await supabase
      .from('installation_photos')
      .select('*')
      .eq('installation_id', id);
    
    if (photoData) {
      // Create signed URLs
      const photosWithUrls = await Promise.all(photoData.map(async (photo) => {
        const { data } = await supabase.storage
          .from('installation-evidence')
          .createSignedUrl(photo.storage_path, 3600); // 1 hour
        return { ...photo, url: data?.signedUrl };
      }));
      setPhotos(photosWithUrls);
    }
    setIsLoadingDetails(false);
  };

  const getEventTitle = (event: any) => {
    switch (event.action) {
      case 'CREATED': return 'Installation Request Created';
      case 'PARTNER_ASSIGNED': return 'Partner Assigned';
      case 'TECHNICIAN_ASSIGNED': return 'Technician Assigned';
      case 'STATUS_CHANGED': 
        const status = event.new_value?.status;
        if (status === 'IN_PROGRESS') return 'Installation Started';
        if (status === 'UNDER_VERIFICATION') return 'Submitted for Verification';
        if (status === 'REVISIT_REQUIRED') return 'Revisit Requested';
        if (status === 'VERIFIED') return 'Installation Verified';
        if (status === 'COMPLETED') return 'Installation Completed';
        return `Status Changed to ${status}`;
      default: return event.action;
    }
  };

  const getEventDetails = (event: any) => {
    switch (event.action) {
      case 'STATUS_CHANGED':
        if (event.new_value?.status === 'REVISIT_REQUIRED') {
          return `Reason: ${event.new_value?.rejection_reason || 'No reason provided'}`;
        }
        return null;
      default: return null;
    }
  };

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
    setIsSubmitting(true);
    const res = await reviewInstallation(id, 'VERIFIED');
    if (res.success) {
      router.refresh();
      setSelectedInst(null);
    } else {
      alert("Failed to verify: " + res.error);
    }
    setIsSubmitting(false);
  };

  const rejectInstallation = async (id: string, reason: string) => {
    setIsSubmitting(true);
    const res = await reviewInstallation(id, 'REVISIT_REQUIRED', reason);
    if (res.success) {
      router.refresh();
      setSelectedInst(null);
    } else {
      alert("Failed to reject: " + res.error);
    }
    setIsSubmitting(false);
  };

  const assignPartner = async (id: string, partnerId: string) => {
    setIsSubmitting(true);
    const res = await assignPartnerAction(id, partnerId);
    if (res.success) {
      router.refresh();
      setSelectedInst(null);
    } else {
      alert("Failed to assign partner: " + res.error);
    }
    setIsSubmitting(false);
  };

  const handleExport = async (params: any) => {
    // We will hook this up to the server action shortly
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative">
      
      {/* Subtle Visual Header */}
      <div className="mb-8 relative rounded-2xl overflow-hidden shadow-sm border border-gray-200/50 bg-white">
        <div className="relative z-10 p-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Installation Management</h1>
            <p className="mt-2 text-sm text-gray-600 max-w-xl">Master view of all EV charger installations across the network. Review, dispatch, and verify installations to ensure quality and compliance.</p>
          </div>
          <div>
            <AddOrderButton />
          </div>
        </div>
      </div>

      <InstallationFilters 
        showOem={true}
        showDealer={true}
        showPartner={true}
        showTechnician={true}
        oems={oems}
        dealers={dealers}
        partners={partners}
        technicians={technicians}
        onExport={handleExport}
      />

      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installation ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charger</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {initialInstallations.map((inst) => {
                const c = inst.customers;
                const d = inst.dealers;
                const p = inst.partners;

                return (
                  <tr key={inst.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedInst(inst)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inst.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{c?.name}</div>
                      <div className="text-sm text-gray-500">{c?.city}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{inst.chargers?.serial_number || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{inst.chargers?.model}</div>
                    </td>
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
        </div>
        {initialInstallations.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No records found.
          </div>
        )}
        <Pagination totalItems={totalCount} />
      </div>

      {/* Side Drawer */}
      <AnimatePresence>
        {selectedInst && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <motion.div 
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
              onClick={() => setSelectedInst(null)} 
              aria-hidden="true" 
            />
            
            <motion.div 
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative z-10 flex flex-col w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-5 bg-[#243B36] text-white flex justify-between items-center shrink-0 shadow-sm z-20">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2" id="modal-title">
                    <BatteryCharging className="h-5 w-5 text-[#D6A84F]" />
                    INSTALLATION DETAILS
                  </h2>
                  <p className="text-sm text-gray-300 mt-1">{selectedInst.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedInst(null)} 
                  className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <span className="sr-only">Close panel</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50/50 space-y-6">
                    
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
                        <p className="mt-1 text-sm text-gray-900 font-semibold">{selectedInst.customers?.name}</p>
                        <p className="text-sm text-gray-500">{selectedInst.customers?.phone}</p>
                        <p className="text-sm text-gray-500">{selectedInst.customers?.address}, {selectedInst.customers?.city}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Dealer</h3>
                        <p className="mt-1 text-sm text-gray-900">{selectedInst.dealers?.name}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Partner & Technician</h3>
                        <p className="mt-1 text-sm text-gray-900">{selectedInst.partners?.name || 'Unassigned'}</p>
                        {selectedInst.partners?.address && (
                          <p className="text-sm text-gray-500">{selectedInst.partners.address}</p>
                        )}
                        <p className="mt-2 text-sm text-gray-500">
                          <span className="font-medium">Tech:</span> {selectedInst.technicians?.name ? selectedInst.technicians.name : 'Unassigned'}
                        </p>
                        {selectedInst.technicians?.address && (
                          <p className="text-sm text-gray-500 pl-10">{selectedInst.technicians.address}</p>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Order Details</h3>
                        <p className="mt-1 text-xs text-gray-500">Tracking Token:</p>
                        <p className="text-sm text-gray-900 font-mono break-all">{selectedInst.tracking_token || 'N/A'}</p>
                        <p className="mt-2 text-xs text-gray-500">Remarks:</p>
                        <p className="text-sm text-gray-900">{selectedInst.remarks || 'None'}</p>
                      </div>
                    </div>


                    {/* Timeline Events */}
                    <div className="mt-8 border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-6">Event Timeline</h3>
                      {isLoadingDetails ? (
                        <div className="text-sm text-gray-500">Loading events...</div>
                      ) : events.length > 0 ? (
                        <div className="flow-root">
                          <ul role="list" className="-mb-8">
                            {events.map((event, eventIdx) => (
                              <li key={event.id}>
                                <div className="relative pb-8">
                                  {eventIdx !== events.length - 1 ? (
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                  ) : null}
                                  <div className="relative flex space-x-3">
                                    <div>
                                      <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
                                        <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                      <div>
                                        <p className="text-sm text-gray-900 font-medium">{getEventTitle(event)}</p>
                                        <p className="text-sm text-gray-500">By: {event.actor?.name || 'System'} ({event.actor?.role || 'System'})</p>
                                        {getEventDetails(event) && (
                                          <p className="mt-1 text-sm text-red-600">{getEventDetails(event)}</p>
                                        )}
                                      </div>
                                      <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                                        <p>{new Date(event.created_at).toLocaleDateString()}</p>
                                        <p>{new Date(event.created_at).toLocaleTimeString()}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No events recorded.</p>
                      )}
                    </div>

                    {/* Checklist */}
                    {isLoadingDetails ? (
                      <div className="mt-8 border-t pt-6 text-center text-gray-500">Loading checklist...</div>
                    ) : checklists.length > 0 ? (
                      <div className="mt-8 border-t pt-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Checklist Results</h3>
                        <ul className="space-y-3">
                          {checklists.map((item) => (
                            <li key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                              <span className="text-sm font-medium">
                                {item.item_name} {item.is_required && <span className="text-red-500">*</span>}
                              </span>
                              <span className={`px-2 py-1 text-xs font-bold rounded ${
                                item.status === 'YES' ? 'bg-green-100 text-green-800' :
                                item.status === 'NO' ? 'bg-red-100 text-red-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {item.status}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {/* Photos */}
                    {isLoadingDetails ? (
                      <div className="mt-8 border-t pt-6 text-center text-gray-500">Loading photos...</div>
                    ) : (
                      <EvidenceManager 
                        installationId={selectedInst.id}
                        category={selectedInst.category}
                        existingPhotos={photos}
                        onUploadSuccess={() => loadDetails(selectedInst.id)}
                      />
                    )}

                    {selectedInst.rejection_reason && (
                       <div className="mt-8 border-t pt-6">
                          <h3 className="text-lg font-medium text-red-600 mb-2">Rejection Reason</h3>
                          <p className="text-sm text-gray-900">{selectedInst.rejection_reason}</p>
                       </div>
                    )}

                  </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
