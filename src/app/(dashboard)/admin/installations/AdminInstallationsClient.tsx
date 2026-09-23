"use client";
import { CopyTechnicianLink } from '@/components/installations/CopyTechnicianLink';
import { ReviewDrawer } from '@/components/installations/ReviewDrawer';


import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignPartnerAction } from '@/app/actions/assignPartner';
import { assignTechnician } from '@/app/actions/assignTechnician';
import { updateInstallationOrderDetailsAction } from '@/app/actions/createInstallationOrder';
import { createClient } from '@/utils/supabase/client';
import { Installation, Customer } from '@/lib/types';
import { reviewInstallation } from '@/app/actions/reviewInstallation';
import Image from 'next/image';
import { EvidenceManager } from '@/components/installations/EvidenceManager';
import { BatteryCharging, Filter, ChevronLeft, ChevronRight, X, User, Search } from 'lucide-react';
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
import { downloadCSV } from '@/utils/csv';
import { Download } from 'lucide-react';

export function AdminInstallationsClient({ initialInstallations, totalCount, oems, dealers, partners, technicians }: Props) {
  const router = useRouter();
  const supabase = createClient();
  
  const [selectedInst, setSelectedInst] = useState<any | null>(null);
  const [reviewInstId, setReviewInstId] = useState<string | null>(null);
  const [assigningPartnerInst, setAssigningPartnerInst] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);

  const activePartnersList = React.useMemo(() => {
    return partners.filter(p => p.type === 'PARTNER' && (p.status === 'ACTIVE' || !p.status));
  }, [partners]);

  const filteredPartnersList = React.useMemo(() => {
    if (!partnerSearchQuery.trim()) return activePartnersList;
    const q = partnerSearchQuery.toLowerCase();
    return activePartnersList.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.display_id?.toLowerCase().includes(q)
    );
  }, [activePartnersList, partnerSearchQuery]);
  
  // New state for Review Workflow
  const [checklists, setChecklists] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (selectedInst) {
      loadDetails(selectedInst.id);
    }
    
    if (selectedInst || assigningPartnerInst) {
      document.body.style.overflow = 'hidden';
    } else {
      if (!selectedInst) {
        setChecklists([]);
        setPhotos([]);
      }
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedInst, assigningPartnerInst]);

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

  const [isAssigningTech, setIsAssigningTech] = useState(false);
  const [isEditingPartner, setIsEditingPartner] = useState(false);
  const [isEditingTech, setIsEditingTech] = useState(false);
  const [techSearchQuery, setTechSearchQuery] = useState("");
  const [isEditingOrderDetails, setIsEditingOrderDetails] = useState(false);
  const [isSavingOrderDetails, setIsSavingOrderDetails] = useState(false);

  const handleAssignPartnerFromDrawer = async (id: string, partnerInput: string) => {
    setIsSubmitting(true);
    const res = await assignPartnerAction(id, partnerInput);
    if (res.success) {
      const { data: updatedInst } = await supabase
        .from('installations')
        .select(`
          *,
          customers:customer_id (id, display_id, name, phone, address, city),
          dealers:dealer_id (id, display_id, name),
          partners:partner_id (id, display_id, name, type, address),
          technicians:technician_id (id, display_id, name, phone),
          chargers:charger_id (id, display_id, serial_number, model)
        `)
        .eq('id', id)
        .single();

      if (updatedInst) {
        setSelectedInst(updatedInst);
      }
      setIsEditingPartner(false);
      setPartnerSearchQuery('');
      router.refresh();
    } else {
      alert("Failed to assign partner: " + (res.error || 'Unknown error'));
    }
    setIsSubmitting(false);
  };

  const handleAssignTechnician = async (id: string, techInput: string) => {
    setIsAssigningTech(true);
    const res = await assignTechnician(id, techInput);
    if (res.success) {
      const { data: updatedInst } = await supabase
        .from('installations')
        .select(`
          *,
          customers:customer_id (id, display_id, name, phone, address, city),
          dealers:dealer_id (id, display_id, name),
          partners:partner_id (id, display_id, name, type, address),
          technicians:technician_id (id, display_id, name, phone),
          chargers:charger_id (id, display_id, serial_number, model)
        `)
        .eq('id', id)
        .single();

      if (updatedInst) {
        setSelectedInst(updatedInst);
      }
      setIsEditingTech(false);
      setTechSearchQuery('');
      router.refresh();
    } else {
      alert("Failed to assign technician: " + (res.error || 'Unknown error'));
    }
    setIsAssigningTech(false);
  };

  const handleUpdateOrderDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInst) return;
    setIsSavingOrderDetails(true);
    const formData = new FormData(e.currentTarget);
    const res = await updateInstallationOrderDetailsAction(selectedInst.id, formData);
    if (res.success) {
      const { data: updatedInst } = await supabase
        .from('installations')
        .select(`
          *,
          customers:customer_id (id, display_id, name, phone, address, city),
          dealers:dealer_id (id, display_id, name),
          partners:partner_id (id, display_id, name, type, address),
          technicians:technician_id (id, display_id, name, phone),
          chargers:charger_id (id, display_id, serial_number, model)
        `)
        .eq('id', selectedInst.id)
        .single();

      if (updatedInst) {
        setSelectedInst(updatedInst);
      }
      setIsEditingOrderDetails(false);
      router.refresh();
    } else {
      alert("Failed to update order details: " + (res.error || 'Unknown error'));
    }
    setIsSavingOrderDetails(false);
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
                  <tr key={inst.id} className="acs-table-row cursor-pointer" onClick={() => setSelectedInst(inst)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inst.display_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{c?.name}</div>
                      <div className="text-sm text-gray-500">{c?.city}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d?.name || inst.custom_dealer_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{inst.chargers?.serial_number || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{inst.chargers?.model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p?.name || (inst.custom_partner_name ? `${inst.custom_partner_name} (Not registered)` : '-')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(inst.status)}`}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                      {inst.status === 'UNDER_VERIFICATION' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewInstId(inst.id);
                          }}
                          className="text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-bold px-2.5 py-1 rounded text-xs transition-colors"
                        >
                          Review Installation
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewInstId(inst.id);
                          }}
                          className="text-acs-primary hover:text-acs-primary/80 font-medium text-xs py-1"
                        >
                          Review Evidence
                        </button>
                      )}
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

      {/* Assign Partner Modal */}
      <AnimatePresence>
        {assigningPartnerInst && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="acs-backdrop"
              onClick={() => { setAssigningPartnerInst(null); setSelectedPartnerId(''); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="acs-modal"
            >
              <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">Assign Installation Partner</h3>
                <button onClick={() => { setAssigningPartnerInst(null); setSelectedPartnerId(''); }} className="text-gray-400 hover:text-gray-500">
                  <span className="sr-only">Close</span>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-500 mb-4">
                  Select a partner for installation #{assigningPartnerInst.display_id}. The selected partner will be notified.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Installation Partner</label>
                    <select 
                      value={selectedPartnerId}
                      onChange={(e) => setSelectedPartnerId(e.target.value)}
                      className="w-full rounded-md border-gray-300 border px-3 text-sm py-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a partner...</option>
                      {partners.map(p => <option key={p.id} value={p.id}>{p.name} {p.metadata?.serviceRegions ? `(${p.metadata.serviceRegions.join(', ')})` : ''}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-8">
                  <button 
                    onClick={() => { setAssigningPartnerInst(null); setSelectedPartnerId(''); }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedPartnerId) { handleAssignPartnerFromDrawer(assigningPartnerInst.id, selectedPartnerId); }
                    }}
                    className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                    disabled={!selectedPartnerId || isSubmitting}
                  >
                    {isSubmitting ? 'Assigning...' : 'Assign Partner'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className="acs-backdrop absolute" 
              onClick={() => setSelectedInst(null)} 
              aria-hidden="true" 
            />
            
            <motion.div 
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative z-[110] flex flex-col w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-5 bg-[#243B36] text-white flex justify-between items-center shrink-0 shadow-sm z-20">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2" id="modal-title">
                    <BatteryCharging className="h-5 w-5 text-[#D6A84F]" />
                    INSTALLATION DETAILS
                  </h2>
                  <p className="text-sm text-gray-300 mt-1">{selectedInst.display_id}</p>
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
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-yellow-800">Verification Required</h3>
                          <button 
                            onClick={() => {
                              const id = selectedInst.id;
                              setSelectedInst(null);
                              setReviewInstId(id);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-3 rounded text-xs shadow transition-colors"
                          >
                            Open Full Review Drawer
                          </button>
                        </div>
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



                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Customer</h3>
                        <p className="mt-1 text-sm text-gray-900 font-semibold">{selectedInst.customers?.name}</p>
                        <p className="text-sm text-gray-500">{selectedInst.customers?.phone}</p>
                        <p className="text-sm text-gray-500">{selectedInst.customers?.address}, {selectedInst.customers?.city}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Dealer</h3>
                        <p className="mt-1 text-sm text-gray-900">{selectedInst.dealers?.name || selectedInst.custom_dealer_name || 'N/A'}</p>
                      </div>
                      <div>
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-medium text-gray-500">Partner Organization</h3>
                          {!isEditingPartner && (
                            <button 
                              onClick={() => setIsEditingPartner(true)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                            >
                              {selectedInst.partner_id || selectedInst.custom_partner_name ? 'Reassign' : 'Assign'}
                            </button>
                          )}
                        </div>

                        {isEditingPartner ? (
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (partnerSearchQuery.trim()) {
                                handleAssignPartnerFromDrawer(selectedInst.id, partnerSearchQuery.trim());
                              }
                            }} 
                            className="mt-2 space-y-2"
                          >
                            <input
                              type="text"
                              placeholder="Partner Name / Email / ID..."
                              value={partnerSearchQuery}
                              onChange={(e) => setPartnerSearchQuery(e.target.value)}
                              disabled={isSubmitting}
                              className="w-full px-3 py-1.5 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-[#243B36] focus:border-[#243B36]"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => { setIsEditingPartner(false); setPartnerSearchQuery(''); }}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSubmitting || !partnerSearchQuery.trim()}
                                className="px-3 py-1 bg-[#243B36] text-white text-xs font-semibold rounded hover:bg-[#1b2d29] disabled:opacity-50"
                              >
                                {isSubmitting ? 'Assigning...' : 'Assign Partner'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <>
                            {selectedInst.partner_id ? (
                              <>
                                <p className="text-sm text-gray-900 mt-1 font-medium">{selectedInst.partners?.name || 'Assigned'}</p>
                                {selectedInst.partners?.address && (
                                  <p className="text-sm text-gray-500">{selectedInst.partners.address}</p>
                                )}
                              </>
                            ) : selectedInst.custom_partner_name ? (
                              <p className="text-sm text-gray-900 mt-1 font-medium">{selectedInst.custom_partner_name} <span className="text-xs text-gray-500 italic">(Not registered)</span></p>
                            ) : (
                              <p className="text-sm text-gray-400 italic mt-1">Unassigned</p>
                            )}
                          </>
                        )}

                        <div className="mt-4">
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-gray-500">Assigned Technician:</p>
                            {!isEditingTech && selectedInst.partner_id && (
                              <button 
                                onClick={() => setIsEditingTech(true)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                              >
                                {selectedInst.technicians?.name ? 'Reassign' : 'Assign'}
                              </button>
                            )}
                          </div>

                          {isEditingTech ? (
                            <form 
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (techSearchQuery.trim()) {
                                  handleAssignTechnician(selectedInst.id, techSearchQuery.trim());
                                }
                              }} 
                              className="mt-2 space-y-2"
                            >
                              <input
                                type="text"
                                placeholder="Technician Name / Phone / ID..."
                                value={techSearchQuery}
                                onChange={(e) => setTechSearchQuery(e.target.value)}
                                disabled={isAssigningTech}
                                className="w-full px-3 py-1.5 text-xs rounded-md border border-gray-300 focus:outline-none focus:ring-[#243B36] focus:border-[#243B36]"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => { setIsEditingTech(false); setTechSearchQuery(''); }}
                                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={isAssigningTech || !techSearchQuery.trim()}
                                  className="px-3 py-1 bg-[#243B36] text-white text-xs font-semibold rounded hover:bg-[#1b2d29] disabled:opacity-50"
                                >
                                  {isAssigningTech ? 'Assigning...' : 'Assign Tech'}
                                </button>
                              </div>
                            </form>
                          ) : selectedInst.technicians?.name ? (
                            <p className="text-sm text-gray-900 mt-1 font-medium">{selectedInst.technicians.name}</p>
                          ) : selectedInst.partner_id ? (
                            <p className="text-sm text-gray-400 italic mt-1">Unassigned (Click Reassign)</p>
                          ) : (
                            <p className="text-sm text-gray-400 italic mt-1">Assign Partner first</p>
                          )}
                        </div>
                        {selectedInst.technicians?.address && (
                          <p className="text-sm text-gray-500 pl-10">{selectedInst.technicians.address}</p>
                        )}
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-medium text-gray-500">Order Details</h3>
                          {!isEditingOrderDetails && (
                            <button 
                              onClick={() => setIsEditingOrderDetails(true)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                            >
                              Edit Details
                            </button>
                          )}
                        </div>

                        {isEditingOrderDetails ? (
                          <form onSubmit={handleUpdateOrderDetails} className="space-y-3 bg-white p-3 border rounded-md text-xs">
                            <div>
                              <label className="block text-gray-700 font-medium mb-1">Category</label>
                              <select 
                                name="category"
                                defaultValue={selectedInst.category || 'INSTALLATION_AND_EARTHING'}
                                className="w-full px-2 py-1 border rounded text-xs"
                              >
                                <option value="INSTALLATION_AND_EARTHING">Installation and Earthing</option>
                                <option value="INSTALLATION_ONLY">Installation Only</option>
                                <option value="EARTHING_ONLY">Earthing Only</option>
                                <option value="SURVEY_ONLY">Survey Only</option>
                                <option value="MAINTENANCE_REPAIR">Maintenance / Repair</option>
                                <option value="DEMO_INSTALLATION">Demo Installation</option>
                                <option value="PRIORITY_INSTALLATION">Priority Installation</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-gray-700 font-medium mb-1">Scheduled Date</label>
                              <input 
                                type="date"
                                name="scheduled_date"
                                defaultValue={selectedInst.scheduled_date ? selectedInst.scheduled_date.split('T')[0] : ''}
                                className="w-full px-2 py-1 border rounded text-xs"
                              />
                            </div>

                            <div>
                              <label className="block text-gray-700 font-medium mb-1">Dealer</label>
                              <input 
                                type="text"
                                name="dealer_query"
                                placeholder="Dealer Name or Display ID"
                                defaultValue={selectedInst.dealers?.name || selectedInst.custom_dealer_name || ''}
                                className="w-full px-2 py-1 border rounded text-xs"
                              />
                              <p className="text-[10px] text-gray-400 mt-0.5">Enter exact name/ID to link active dealer, or typed text for custom dealer name.</p>
                            </div>

                            <div>
                              <label className="block text-gray-700 font-medium mb-1">Remarks</label>
                              <textarea 
                                name="remarks"
                                rows={2}
                                defaultValue={selectedInst.remarks || ''}
                                className="w-full px-2 py-1 border rounded text-xs"
                              />
                            </div>

                            <div className="flex gap-2 justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => setIsEditingOrderDetails(false)}
                                className="px-2 py-1 bg-gray-100 text-gray-600 font-semibold rounded hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSavingOrderDetails}
                                className="px-3 py-1 bg-[#243B36] text-white font-semibold rounded hover:bg-[#1b2d29] disabled:opacity-50"
                              >
                                {isSavingOrderDetails ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs text-gray-500 font-medium">Category: </span>
                              <span className="text-sm font-semibold text-gray-900">{selectedInst.category || 'STANDARD'}</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500 font-medium">Scheduled Date: </span>
                              <span className="text-sm text-gray-900">
                                {selectedInst.scheduled_date ? new Date(selectedInst.scheduled_date).toLocaleDateString() : 'Not scheduled'}
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500 font-medium">Tracking Token: </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-gray-900 font-mono break-all">{selectedInst.tracking_token || 'N/A'}</p>
                                {selectedInst.tracking_token && <CopyTechnicianLink token={selectedInst.tracking_token} technicianId={selectedInst.technician_id} />}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500 font-medium">Remarks: </span>
                              <p className="text-xs text-gray-900">{selectedInst.remarks || 'None'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>


                    {/* Timeline Events */}
                    <div className="mt-8 border-t pt-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-medium text-gray-900">Event Timeline</h3>
                        <button onClick={() => downloadCSV(`installation-timeline-${selectedInst?.id}.csv`, ['Date', 'Time', 'Event', 'Actor', 'Role', 'Details'], events.map(e => [new Date(e.created_at).toLocaleDateString(), new Date(e.created_at).toLocaleTimeString(), getEventTitle(e), e.actor?.name || 'System', e.actor?.role || 'System', getEventDetails(e) || '']))} className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#243B36]"><Download className="mr-1.5 h-3.5 w-3.5 text-gray-500" />Export CSV</button>
                      </div>
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
