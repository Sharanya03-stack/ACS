"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { X, Building2, Store, Users, Wrench, ChevronRight } from 'lucide-react';

type EntityData = {
  id: string;
  name: string;
  status: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  phone?: string | null;
  address?: string | null;
  parent_org?: any;
  organization?: any;
};

type InteractiveMetricCardsProps = {
  oems: EntityData[];
  dealerships: EntityData[];
  partners: EntityData[];
  technicians: EntityData[];
};

type ModalType = 'OEM' | 'DEALER' | 'PARTNER' | 'TECHNICIAN' | null;

export function InteractiveMetricCards({ oems, dealerships, partners, technicians }: InteractiveMetricCardsProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Close modal when clicking escape or backdrop
  const closeModal = () => {
    setActiveModal(null);
  };

  // Prevent background scrolling
  React.useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeModal]);

  const modalConfig = {
    OEM: {
      title: 'Original Equipment Manufacturers',
      icon: <Building2 className="h-5 w-5 text-[#D6A84F]" />,
      data: oems,
      renderItem: (item: EntityData) => (
        <div key={item.id} className="flex justify-between items-start py-4 border-b border-gray-100 last:border-0">
          <div>
            <h4 className="font-semibold text-gray-900">{item.name}</h4>
            {(item.contact_email || item.contact_phone) && (
              <p className="text-sm text-gray-500 mt-1">
                {item.contact_email} {item.contact_email && item.contact_phone && '•'} {item.contact_phone}
              </p>
            )}
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
            {item.status}
          </span>
        </div>
      )
    },
    DEALER: {
      title: 'Dealerships',
      icon: <Store className="h-5 w-5 text-[#D6A84F]" />,
      data: dealerships,
      renderItem: (item: EntityData) => (
        <div key={item.id} className="flex justify-between items-start py-4 border-b border-gray-100 last:border-0">
          <div>
            <h4 className="font-semibold text-gray-900">{item.name}</h4>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium">Parent OEM:</span> {Array.isArray(item.parent_org) ? item.parent_org[0]?.name : item.parent_org?.name || 'Unknown'}
            </p>
            {(item.contact_email || item.contact_phone) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {item.contact_email} {item.contact_email && item.contact_phone && '•'} {item.contact_phone}
              </p>
            )}
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
            {item.status}
          </span>
        </div>
      )
    },
    PARTNER: {
      title: 'Installation Partners',
      icon: <Users className="h-5 w-5 text-[#D6A84F]" />,
      data: partners,
      renderItem: (item: EntityData) => (
        <div key={item.id} className="flex justify-between items-start py-4 border-b border-gray-100 last:border-0">
          <div>
            <h4 className="font-semibold text-gray-900">{item.name}</h4>
            {(item.contact_email || item.contact_phone) && (
              <p className="text-sm text-gray-500 mt-1">
                {item.contact_email} {item.contact_email && item.contact_phone && '•'} {item.contact_phone}
              </p>
            )}
            {item.address && (
              <p className="text-xs text-gray-400 mt-0.5">{item.address}</p>
            )}
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
            {item.status}
          </span>
        </div>
      )
    },
    TECHNICIAN: {
      title: 'Active Technicians',
      icon: <Wrench className="h-5 w-5 text-[#D6A84F]" />,
      data: technicians, // Expected to already be filtered for 'ACTIVE' in the DB query
      renderItem: (item: EntityData) => (
        <div key={item.id} className="flex justify-between items-start py-4 border-b border-gray-100 last:border-0">
          <div>
            <h4 className="font-semibold text-gray-900">{item.name}</h4>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium">Partner:</span> {Array.isArray(item.organization) ? item.organization[0]?.name : item.organization?.name || 'Unknown'}
            </p>
            {(item.phone || item.address) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {item.phone} {item.phone && item.address && '•'} {item.address}
              </p>
            )}
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
            {item.status}
          </span>
        </div>
      )
    }
  };

  const backdropVariants: any = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const panelVariants: any = {
    hidden: { opacity: 0, scale: 0.97, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300, duration: 0.25 } },
    exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.2, ease: "easeOut" } }
  };

  const listContainerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
  };

  const listItemVariants: any = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        
        {/* Total OEMs Card */}
        <motion.div 
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setActiveModal('OEM')}
          className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36] cursor-pointer group relative"
        >
          <div className="flex justify-between items-start">
            <div>
              <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-gray-700 transition-colors">Total OEMs</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={oems.length} /></dd>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-[#243B36]/5 transition-colors">
              <Building2 className="h-5 w-5 text-gray-400 group-hover:text-[#243B36] transition-colors" />
            </div>
          </div>
          <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-xs text-[#D6A84F] font-medium">
            View details <ChevronRight className="h-3 w-3 ml-0.5" />
          </div>
        </motion.div>

        {/* Total Dealerships Card */}
        <motion.div 
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setActiveModal('DEALER')}
          className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36] cursor-pointer group relative"
        >
          <div className="flex justify-between items-start">
            <div>
              <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-gray-700 transition-colors">Total Dealerships</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={dealerships.length} /></dd>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-[#243B36]/5 transition-colors">
              <Store className="h-5 w-5 text-gray-400 group-hover:text-[#243B36] transition-colors" />
            </div>
          </div>
          <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-xs text-[#D6A84F] font-medium">
            View details <ChevronRight className="h-3 w-3 ml-0.5" />
          </div>
        </motion.div>

        {/* Installation Partners Card */}
        <motion.div 
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setActiveModal('PARTNER')}
          className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36] cursor-pointer group relative"
        >
          <div className="flex justify-between items-start">
            <div>
              <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-gray-700 transition-colors">Installation Partners</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={partners.length} /></dd>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-[#243B36]/5 transition-colors">
              <Users className="h-5 w-5 text-gray-400 group-hover:text-[#243B36] transition-colors" />
            </div>
          </div>
          <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-xs text-[#D6A84F] font-medium">
            View details <ChevronRight className="h-3 w-3 ml-0.5" />
          </div>
        </motion.div>

        {/* Active Technicians Card */}
        <motion.div 
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setActiveModal('TECHNICIAN')}
          className="bg-white overflow-hidden shadow-sm hover:shadow-md transition-all rounded-xl border border-gray-100 p-5 border-l-4 border-l-[#243B36] cursor-pointer group relative"
        >
          <div className="flex justify-between items-start">
            <div>
              <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-gray-700 transition-colors">Active Technicians</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900"><AnimatedCounter value={technicians.length} /></dd>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-[#243B36]/5 transition-colors">
              <Wrench className="h-5 w-5 text-gray-400 group-hover:text-[#243B36] transition-colors" />
            </div>
          </div>
          <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-xs text-[#D6A84F] font-medium">
            View details <ChevronRight className="h-3 w-3 ml-0.5" />
          </div>
        </motion.div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {activeModal && modalConfig[activeModal] && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <motion.div 
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              className="acs-backdrop absolute" 
              onClick={closeModal} 
            />
            
            <motion.div 
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative z-10 flex flex-col w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-[#243B36] text-white flex justify-between items-center shrink-0 shadow-sm z-20">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2" id="modal-title">
                    {modalConfig[activeModal].icon}
                    {modalConfig[activeModal].title}
                  </h2>
                  <p className="text-sm text-gray-300 mt-0.5">
                    {modalConfig[activeModal].data.length} total records
                  </p>
                </div>
                <button 
                  onClick={closeModal} 
                  className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable List */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                {modalConfig[activeModal].data.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No records found.
                  </div>
                ) : (
                  <motion.div 
                    variants={listContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-white rounded-xl border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] px-5 py-2"
                  >
                    {modalConfig[activeModal].data.map((item) => (
                      <motion.div key={item.id} variants={listItemVariants}>
                        {modalConfig[activeModal].renderItem(item)}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
