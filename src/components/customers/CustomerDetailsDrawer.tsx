"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { getCustomerDetails } from '@/app/actions/getCustomerDetails';
import { updateCustomer } from '@/app/actions/entityActions';
import { X, User, Car, Zap, Wrench, CheckCircle2, Loader2, Edit2, Save, ShieldCheck, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { WarrantyEditor } from './WarrantyEditor';
import { formatPowerRating } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

const formatStatus = (status: string) => {
  if (!status) return 'N/A';
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export function CustomerDetailsDrawer({ customerId, onClose }: { customerId: string, onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [expandedInsts, setExpandedInsts] = useState<Record<string, boolean>>({});

  // Stop body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getCustomerDetails(customerId);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        toast.error(res.error || 'Failed to load customer details');
        onClose(); // Close if error
      }
      setLoading(false);
    }
    load();
  }, [customerId, onClose]);

  const customer = data?.customer;
  const vehicles = data?.vehicles || [];
  const chargers = data?.chargers || [];
  const installations = data?.installations || [];

  const canEdit = data?.profile?.role === 'ACS_ADMIN' || data?.profile?.role === 'DEALER';

  const handleEditClick = () => {
    setEditForm({
      name: customer?.name || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      address: customer?.address || '',
      city: customer?.city || '',
      state: customer?.state || '',
      pincode: customer?.pincode || ''
    });
    setIsEditingCustomer(true);
  };

  const handleSaveCustomer = async () => {
    setSaving(true);
    const res = await updateCustomer(customerId, editForm);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || 'Failed to update customer');
    } else {
      toast.success('Customer updated successfully');
      setData({ ...data, customer: { ...customer, ...editForm } });
      setIsEditingCustomer(false);
    }
  };

  const toggleInst = (id: string) => {
    setExpandedInsts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Animation variants
  const backdropVariants: any = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const panelVariants: any = {
    hidden: { opacity: 0, scale: 0.97, y: 15 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300, duration: 0.3 } },
    exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.2, ease: "easeOut" } }
  };

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <motion.div 
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={{ duration: 0.2 }}
        className="acs-backdrop absolute" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      {/* Main Panel */}
      <motion.div 
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="acs-modal flex flex-col w-full max-w-5xl max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-[#243B36] text-white flex justify-between items-center shrink-0 shadow-sm z-20">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" id="modal-title">
              <User className="h-5 w-5 text-[#D6A84F]" />
              CUSTOMER PROFILE
            </h2>
            {customer && (
              <p className="text-sm text-gray-300 mt-1 flex items-center gap-2">
                <span className="font-medium text-white">{customer.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                <span>ID: {customer.display_id || customer.customer_id || customer.id.slice(0, 8).toUpperCase()}</span>
              </p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <span className="sr-only">Close panel</span>
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gray-50/50">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin h-8 w-8 text-[#243B36]" />
            </div>
          ) : (
            <motion.div 
              variants={containerVariants} 
              initial="hidden" 
              animate="visible"
              className="space-y-6"
            >
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Customer Information */}
                <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <User className="h-4 w-4 text-[#D6A84F]" /> 
                      Personal Information
                    </h3>
                    {!isEditingCustomer && canEdit && (
                      <button onClick={handleEditClick} className="text-gray-400 hover:text-[#243B36] transition-colors p-1">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {isEditingCustomer ? (
                    <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                      <div className="col-span-2">
                        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1 block">Full Name</label>
                        <input type="text" className="w-full border rounded-md p-1.5 text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1 block">Phone</label>
                        <input type="text" className="w-full border rounded-md p-1.5 text-sm" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1 block">Email</label>
                        <input type="email" className="w-full border rounded-md p-1.5 text-sm" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1 block">Full Address</label>
                        <input type="text" className="w-full border rounded-md p-1.5 text-sm" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1 block">City</label>
                        <input type="text" className="w-full border rounded-md p-1.5 text-sm" value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1 block">State</label>
                        <input type="text" className="w-full border rounded-md p-1.5 text-sm" value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1 block">Pincode</label>
                        <input type="text" className="w-full border rounded-md p-1.5 text-sm" value={editForm.pincode} onChange={e => setEditForm({...editForm, pincode: e.target.value})} />
                      </div>
                      <div className="col-span-2 mt-4 flex justify-end gap-2 border-t pt-4">
                        <button onClick={() => setIsEditingCustomer(false)} className="px-3 py-1.5 text-sm border rounded-md">Cancel</button>
                        <button onClick={handleSaveCustomer} disabled={saving} className="px-3 py-1.5 text-sm bg-[#D6A84F] text-black font-medium rounded-md hover:bg-[#c59844] flex items-center gap-2">
                          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save All'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-5 flex-1">
                      <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Full Name</p>
                          <p className="text-sm font-medium text-gray-900">{customer?.name || 'N/A'}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Customer ID</p>
                          <p className="text-sm text-gray-900">{customer?.display_id || customer?.customer_id || customer?.id?.slice(0,8).toUpperCase() || 'N/A'}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Phone</p>
                          <p className="text-sm text-gray-900">{customer?.phone || 'N/A'}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Email</p>
                          <p className="text-sm text-gray-900">{customer?.email || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-100 pt-5 mt-auto">
                        <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                          <div className="col-span-2">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Full Address</p>
                            <p className="text-sm text-gray-900">{customer?.address || 'N/A'}</p>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">City</p>
                            <p className="text-sm text-gray-900">{customer?.city || 'N/A'}</p>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">State & Pincode</p>
                            <p className="text-sm text-gray-900">
                              {customer?.state ? `${customer.state} ` : 'N/A '} 
                              {customer?.pincode ? `- ${customer.pincode}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* 2. Vehicle Information */}
                <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
                  <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                    <Car className="h-4 w-4 text-[#243B36]" /> 
                    Vehicle Information
                  </h3>
                  {vehicles.length > 0 ? (
                    <div className="space-y-6">
                      {vehicles.map((v: any) => (
                        <div key={v.id} className="grid grid-cols-2 gap-y-5 gap-x-4 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                          <div className="col-span-2 sm:col-span-1">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Vehicle Model</p>
                            <p className="text-sm text-gray-900 font-medium">{v.model || 'N/A'}</p>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">VIN</p>
                            <p className="text-sm text-gray-900 font-mono bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100">{v.vin || 'N/A'}</p>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Sale Date</p>
                            <p className="text-sm text-gray-900">{v.sale_date ? new Date(v.sale_date).toLocaleDateString() : 'N/A'}</p>
                          </div>
                          <div className="col-span-2 sm:col-span-1">
                            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Dealership</p>
                            <p className="text-sm text-gray-900">{v.dealer_name || 'N/A'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                      <p className="text-sm font-medium">No vehicle assigned</p>
                    </div>
                  )}
                </motion.div>
                
              </div>

              {/* 3. Charger & Warranty Information */}
              <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
                <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-[#243B36]" /> 
                  Chargers & Warranty
                </h3>
                {chargers.length > 0 ? (
                  <div className="space-y-8">
                    {chargers.map((c: any) => (
                      <div key={c.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-gray-50 p-4 border-b border-gray-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-4">
                            <div className="col-span-2 md:col-span-1">
                              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Charger Model</p>
                              <p className="text-sm text-gray-900 font-medium">{c.model || 'N/A'}</p>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Power Rating</p>
                              <p className="text-sm text-gray-900">{c.power_rating ? formatPowerRating(c.power_rating) : 'N/A'}</p>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Serial Number</p>
                              <p className="text-sm text-gray-900 font-mono bg-white inline-block px-2 py-0.5 rounded border border-gray-200">{c.serial_number || 'N/A'}</p>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                              <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Supplied Date</p>
                              <p className="text-sm text-gray-900">{c.supplied_date ? new Date(c.supplied_date).toLocaleDateString() : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 bg-white">
                          <WarrantyEditor 
                            charger={c} 
                            profile={data?.profile} 
                            onUpdated={() => {
                              getCustomerDetails(customerId).then(res => {
                                if (res.success) setData(res.data);
                              });
                            }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                    <p className="text-sm font-medium">No charger assigned</p>
                  </div>
                )}
              </motion.div>

              {/* 4. Installation Information */}
              <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
                <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[#243B36]" /> 
                  Installations
                </h3>
                
                {installations.length > 0 ? (
                  <div className="space-y-4">
                    {installations.map((inst: any, idx: number) => {
                      const isExpanded = expandedInsts[inst.id] || installations.length === 1;
                      
                      return (
                        <div key={inst.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                          <div 
                            className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50 border-b border-gray-200' : ''}`}
                            onClick={() => toggleInst(inst.id)}
                          >
                            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Status</p>
                                {['VERIFIED', 'COMPLETED'].includes(inst.status) ? (
                                  <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4" /> Completed
                                  </p>
                                ) : inst.status === 'REVISIT_REQUIRED' ? (
                                  <p className="text-sm text-red-600 font-medium flex items-center gap-1.5">Revisit Required</p>
                                ) : (
                                  <p className="text-sm text-blue-600 font-medium">{formatStatus(inst.status)}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Scheduled Date</p>
                                <p className="text-sm text-gray-900">{inst.scheduled_date ? new Date(inst.scheduled_date).toLocaleDateString() : 'Not Scheduled'}</p>
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Category</p>
                                <p className="text-sm text-gray-900">{formatStatus(inst.category) || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Partner</p>
                                <p className="text-sm text-gray-900">{inst.partner_name || 'Unassigned'}</p>
                              </div>
                            </div>
                            {installations.length > 1 && (
                              <button className="text-gray-400 p-2 hover:bg-gray-200 rounded-full transition-colors self-end md:self-auto">
                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              </button>
                            )}
                          </div>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-6">
                                  
                                  <div className="space-y-4">
                                    <div>
                                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Technician</p>
                                      <p className="text-sm text-gray-900">{inst.technician_name || 'Unassigned'}</p>
                                    </div>
                                    
                                    {inst.completed_at && (
                                      <div>
                                        <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Completion Date</p>
                                        <p className="text-sm text-gray-900">{new Date(inst.completed_at).toLocaleDateString()}</p>
                                      </div>
                                    )}
                                    
                                    {inst.remarks && (
                                      <div>
                                        <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Order Remarks</p>
                                        <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-100">{inst.remarks}</p>
                                      </div>
                                    )}
                                    
                                    {inst.rejection_reason && (
                                      <div className="p-3 bg-red-50 rounded border border-red-100">
                                        <p className="text-[11px] text-red-800 uppercase tracking-wider font-semibold mb-1">Revisit Reason</p>
                                        <p className="text-sm text-red-900">{inst.rejection_reason}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div>
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
                                      <ImageIcon className="h-3 w-3" /> Evidence Photos
                                    </p>
                                    {inst.photos && inst.photos.length > 0 ? (
                                      <div className="grid grid-cols-3 gap-2">
                                        {inst.photos.map((photo: any) => (
                                          <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded border border-gray-200 overflow-hidden">
                                            {photo.url ? (
                                              <Image src={photo.url} alt={photo.category} fill className="object-cover transition-transform group-hover:scale-105" unoptimized />
                                            ) : (
                                              <div className="flex items-center justify-center h-full text-[10px] text-gray-400">N/A</div>
                                            )}
                                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <p className="text-[9px] text-white text-center truncate">{photo.category.replace(/_/g, ' ')}</p>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-400 italic">No photos uploaded.</p>
                                    )}
                                  </div>
                                  
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                    <p className="text-sm font-medium">No installation recorded yet</p>
                  </div>
                )}
              </motion.div>

            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export function CustomerNameCell({ id, name, city }: { id: string, name: string, city?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} 
        className="text-[#243B36] font-medium hover:text-[#D6A84F] hover:underline transition-colors text-left"
      >
        <div className="text-sm font-medium">{name}</div>
        {city && <div className="text-xs text-gray-500">{city}</div>}
      </button>
      <AnimatePresence>
        {isOpen && <CustomerDetailsDrawer key="drawer" customerId={id} onClose={() => setIsOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
