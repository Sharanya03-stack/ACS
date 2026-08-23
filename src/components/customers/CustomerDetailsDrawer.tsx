"use client";

import React, { useEffect, useState } from 'react';
import { getCustomerDetails } from '@/app/actions/getCustomerDetails';
import { X, User, Car, Zap, Wrench, Clock, FileText, CheckCircle2, MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { WarrantyEditor } from './WarrantyEditor';
import { formatPowerRating } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

export function CustomerDetailsDrawer({ customerId, onClose }: { customerId: string, onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
  const vehicle = data?.vehicle;
  const charger = data?.charger;
  const inst = data?.installation;

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
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      {/* Main Panel */}
      <motion.div 
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative z-10 flex flex-col w-full max-w-5xl max-h-[90vh] bg-gray-50 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-[#243B36] text-white flex justify-between items-center shrink-0 shadow-sm z-20">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" id="modal-title">
              <User className="h-5 w-5 text-[#D6A84F]" />
              CUSTOMER DETAILS
            </h2>
            {customer && (
              <p className="text-sm text-gray-300 mt-1 flex items-center gap-2">
                <span className="font-medium text-white">{customer.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                <span>ID: {customer.customer_id || customer.id.slice(0, 8).toUpperCase()}</span>
                {customer.status && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                    <span className="px-2 py-0.5 rounded text-xs bg-white/20 uppercase tracking-wider">{customer.status}</span>
                  </>
                )}
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
                
                {/* 1. Personal Information */}
                <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
                  <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-[#D6A84F]" /> 
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Full Name</p>
                      <p className="text-sm font-medium text-gray-900">{customer?.name || 'N/A'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Customer ID</p>
                      <p className="text-sm text-gray-900">{customer?.customer_id || customer?.id?.slice(0,8).toUpperCase() || 'N/A'}</p>
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
                </motion.div>

                {/* 2. Address */}
                <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
                  <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#D6A84F]" /> 
                    Address Details
                  </h3>
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
                </motion.div>

                {/* 3. Vehicle Information */}
                <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
                  <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                    <Car className="h-4 w-4 text-[#243B36]" /> 
                    Vehicle Information
                  </h3>
                  <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Vehicle Model</p>
                      <p className="text-sm text-gray-900 font-medium">{vehicle?.model || 'N/A'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Registration / VIN</p>
                      <p className="text-sm text-gray-900 font-mono bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100">{vehicle?.vin || 'N/A'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Sale Date</p>
                      <p className="text-sm text-gray-900">{vehicle?.sale_date ? new Date(vehicle.sale_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Dealership</p>
                      <p className="text-sm text-gray-900">{vehicle?.dealer_name || 'N/A'}</p>
                    </div>
                  </div>
                </motion.div>

                {/* 4. Charger Information */}
                <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
                  <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#243B36]" /> 
                    Charger Information
                  </h3>
                  <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Charger Model</p>
                      <p className="text-sm text-gray-900 font-medium">{charger?.model || 'N/A'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Power Rating</p>
                      <p className="text-sm text-gray-900">{charger?.power_rating ? formatPowerRating(charger.power_rating) : 'N/A'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Serial Number</p>
                      <p className="text-sm text-gray-900 font-mono bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100">{charger?.serial_number || 'N/A'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Supplied Date</p>
                      <p className="text-sm text-gray-900">{charger?.supplied_date ? new Date(charger.supplied_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                </motion.div>
                
              </div>

              {/* 5. Installation Details */}
              <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
                <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-[#243B36]" /> 
                  Installation Information
                </h3>
                {inst ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Status</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#243B36]/10 text-[#243B36] border border-[#243B36]/20">
                        {inst.status || 'N/A'}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Category</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {inst.category === 'INSTALLATION_AND_EARTHING' ? 'Installation + Earthing' : inst.category === 'INSTALLATION_ONLY' ? 'Installation Only' : (inst.category || 'N/A')}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Partner</p>
                      <p className="text-sm text-gray-900">{inst.partner_name || 'Unassigned'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Technician</p>
                      <p className="text-sm text-gray-900">{inst.technician_name || 'Unassigned'}</p>
                    </div>
                    
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Request Date</p>
                      <p className="text-sm text-gray-900">{inst.created_at ? new Date(inst.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Scheduled Date</p>
                      <p className="text-sm text-gray-900">{inst.scheduled_date ? new Date(inst.scheduled_date).toLocaleDateString() : 'Not Scheduled'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Completion Date</p>
                      <p className="text-sm text-gray-900">{inst.completed_at ? new Date(inst.completed_at).toLocaleDateString() : 'Pending'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Verification Status</p>
                      {['VERIFIED', 'COMPLETED'].includes(inst.status) ? (
                        <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" /> Verified
                        </p>
                      ) : inst.status === 'REVISIT_REQUIRED' ? (
                        <p className="text-sm text-red-600 font-medium flex items-center gap-1.5">Revisit Required</p>
                      ) : (
                        <p className="text-sm text-gray-500">Pending</p>
                      )}
                    </div>
                    
                    {inst.rejection_reason && (
                      <div className="col-span-2 md:col-span-4 p-4 bg-red-50/80 rounded-lg border border-red-100 mt-2">
                        <p className="text-[11px] text-red-800 uppercase tracking-wider font-semibold mb-1">Revisit Reason</p>
                        <p className="text-sm text-red-900">{inst.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                    <p className="text-sm font-medium">No installation records found for this customer.</p>
                  </div>
                )}
              </motion.div>

              {/* 6. Installation Timeline (Only if inst exists) */}
              {inst && (
                <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-gray-100">
                  <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-6 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#D6A84F]" /> 
                    Installation Timeline
                  </h3>
                  <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pl-6 pb-2">
                    <div className="relative">
                      <span className="absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border-2 border-white bg-[#243B36] shadow-sm"></span>
                      <h4 className="text-sm font-semibold text-gray-900">Request Created</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(inst.created_at).toLocaleString()}</p>
                    </div>
                    
                    <div className={`relative ${inst.partner_id ? 'opacity-100' : 'opacity-40'}`}>
                      <span className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border-2 border-white shadow-sm ${inst.partner_id ? 'bg-[#243B36]' : 'bg-gray-200'}`}></span>
                      <h4 className="text-sm font-semibold text-gray-900">Partner Assigned</h4>
                      {inst.partner_id && <p className="text-xs text-gray-500 mt-0.5">{inst.partner_name}</p>}
                    </div>

                    <div className={`relative ${inst.technician_id ? 'opacity-100' : 'opacity-40'}`}>
                      <span className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border-2 border-white shadow-sm ${inst.technician_id ? 'bg-[#243B36]' : 'bg-gray-200'}`}></span>
                      <h4 className="text-sm font-semibold text-gray-900">Technician Assigned</h4>
                      {inst.technician_id && <p className="text-xs text-gray-500 mt-0.5">{inst.technician_name}</p>}
                    </div>

                    <div className={`relative ${inst.started_at ? 'opacity-100' : 'opacity-40'}`}>
                      <span className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border-2 border-white shadow-sm ${inst.started_at ? 'bg-[#243B36]' : 'bg-gray-200'}`}></span>
                      <h4 className="text-sm font-semibold text-gray-900">Installation Started</h4>
                      {inst.started_at && <p className="text-xs text-gray-500 mt-0.5">{new Date(inst.started_at).toLocaleString()}</p>}
                    </div>

                    <div className={`relative ${inst.completed_at ? 'opacity-100' : 'opacity-40'}`}>
                      <span className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border-2 border-white shadow-sm ${inst.completed_at ? 'bg-[#243B36]' : 'bg-gray-200'}`}></span>
                      <h4 className="text-sm font-semibold text-gray-900">Installation Submitted</h4>
                      {inst.completed_at && <p className="text-xs text-gray-500 mt-0.5">{new Date(inst.completed_at).toLocaleString()}</p>}
                    </div>

                    <div className={`relative ${['VERIFIED', 'COMPLETED'].includes(inst.status) ? 'opacity-100' : 'opacity-40'}`}>
                      <span className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border-2 border-white shadow-sm ${['VERIFIED', 'COMPLETED'].includes(inst.status) ? 'bg-emerald-500' : 'bg-gray-200'}`}></span>
                      <h4 className="text-sm font-semibold text-gray-900">ACS Verified</h4>
                      {inst.verified_at && <p className="text-xs text-gray-500 mt-0.5">{new Date(inst.verified_at).toLocaleString()}</p>}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 7. Warranty Section */}
              <motion.div variants={itemVariants}>
                <WarrantyEditor 
                  charger={charger} 
                  profile={data?.profile} 
                  onUpdated={() => {
                    // Reload data to reflect changes
                    getCustomerDetails(customerId).then(res => {
                      if (res.success) setData(res.data);
                    });
                  }} 
                />
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
