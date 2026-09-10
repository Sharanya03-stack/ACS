"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AddOrderButton } from '@/components/installations/AddOrderButton';
import { ExportCSVButton } from '@/app/(dashboard)/admin/reports/ExportCSVButton';
import { InstallationFilters } from '@/components/ui/InstallationFilters';
import { Pagination } from '@/components/ui/Pagination';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, BatteryCharging, X, Search } from 'lucide-react';
import { EvidenceManager } from '@/components/installations/EvidenceManager';
import { assignPartnerAction, getActivePartnersAction } from '@/app/actions/assignPartner';

interface Props {
  installations: any[];
  totalCount: number;
  totalDealers: number;
  totalVehicles: number;
  pendingInstallations: number;
  completedInstallations: number;
  dealers: any[];
}

export default function OemDashboardClient({
  installations,
  totalCount,
  totalDealers,
  totalVehicles,
  pendingInstallations,
  completedInstallations,
  dealers
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [selectedInst, setSelectedInst] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Partners for assignment
  const [activePartners, setActivePartners] = useState<any[]>([]);
  const [isAssigningPartner, setIsAssigningPartner] = useState(false);
  const [partnerSearchQuery, setPartnerSearchQuery] = useState("");
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);

  const filteredPartnersList = React.useMemo(() => {
    if (!partnerSearchQuery.trim()) return activePartners;
    const q = partnerSearchQuery.toLowerCase();
    return activePartners.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.display_id?.toLowerCase().includes(q)
    );
  }, [activePartners, partnerSearchQuery]);

  useEffect(() => {
    const fetchPartners = async () => {
      const res = await getActivePartnersAction();
      if (res.success && res.data) {
        setActivePartners(res.data);
      } else {
        const { data } = await supabase
          .from('organizations')
          .select('id, display_id, name, type, status')
          .eq('type', 'PARTNER')
          .eq('status', 'ACTIVE')
          .order('name');
        if (data) setActivePartners(data);
      }
    };
    fetchPartners();
  }, []);

  const handleAssignPartner = async (id: string, partnerId: string) => {
    setIsAssigningPartner(true);
    const res = await assignPartnerAction(id, partnerId);
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
      router.refresh();
    } else {
      alert("Failed to assign partner: " + res.error);
    }
    setIsAssigningPartner(false);
  };

  // Detail Modal state
  const [checklists, setChecklists] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    if (selectedInst) {
      loadDetails(selectedInst.id);
      document.body.style.overflow = 'hidden';
    } else {
      setChecklists([]);
      setPhotos([]);
      setEvents([]);
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedInst]);

  const loadDetails = async (id: string) => {
    setIsLoadingDetails(true);

    const [
      { data: eventData },
      { data: checklistData },
      { data: photoData }
    ] = await Promise.all([
      supabase
        .from('audit_logs')
        .select(`
          *,
          actor:profiles!user_id (name, role)
        `)
        .eq('entity_type', 'INSTALLATION')
        .eq('entity_id', id)
        .order('created_at', { ascending: true }),

      supabase
        .from('installation_checklists')
        .select('*')
        .eq('installation_id', id),

      supabase
        .from('installation_photos')
        .select('*')
        .eq('installation_id', id)
    ]);

    if (eventData) setEvents(eventData);
    if (checklistData) setChecklists(checklistData);

    if (photoData) {
      const photosWithUrls = await Promise.all(
        photoData.map(async (photo) => {
          const { data } = await supabase.storage
            .from('installation-evidence')
            .createSignedUrl(photo.storage_path, 3600);
          return { ...photo, url: data?.signedUrl };
        })
      );
      setPhotos(photosWithUrls);
    }

    setIsLoadingDetails(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">New</span>;
      case 'PARTNER_ASSIGNED':
        return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">Partner Assigned</span>;
      case 'TECHNICIAN_ASSIGNED':
        return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-cyan-100 text-cyan-800">Tech Assigned</span>;
      case 'SCHEDULED':
        return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">Scheduled</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">In Progress</span>;
      case 'UNDER_VERIFICATION':
        return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">Under Verification</span>;
      case 'VERIFIED':
        return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">Verified</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span>;
      case 'REVISIT_REQUIRED':
        return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Revisit Required</span>;
      case 'CANCELLED':
      case 'FAILED':
        return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
      default:
        return <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status || '-'}</span>;
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const panelVariants: any = {
    hidden: { opacity: 0, scale: 0.97, y: 15 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300, duration: 0.3 } },
    exit: { opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.2, ease: "easeOut" } }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OEM Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Track EV sales and charger installation performance for your brand.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-acs-primary"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <ExportCSVButton />
          <AddOrderButton />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Link href="/oem/dealerships" className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group relative">
          <dt className="text-sm font-semibold text-gray-600 tracking-wide uppercase truncate group-hover:text-acs-primary transition-colors">Associated Dealerships</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalDealers || 0}</dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link href="/oem/vehicles" className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group relative">
          <dt className="text-sm font-semibold text-gray-600 tracking-wide uppercase truncate group-hover:text-acs-primary transition-colors">Total EV Sales</dt>
          <dd className="mt-1 text-3xl font-semibold text-gray-900">{totalVehicles || 0}</dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link href="/oem/active" className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group relative">
          <dt className="text-sm font-semibold text-gray-600 tracking-wide uppercase truncate group-hover:text-acs-primary transition-colors">Pending Charger Installs</dt>
          <dd className="mt-1 text-3xl font-semibold text-acs-accent">{pendingInstallations || 0}</dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
        <Link href="/oem/completed" className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group relative">
          <dt className="text-sm font-semibold text-gray-600 tracking-wide uppercase truncate group-hover:text-acs-primary transition-colors">Completed Installs</dt>
          <dd className="mt-1 text-3xl font-semibold text-green-600">{completedInstallations || 0}</dd>
          <div className="absolute top-5 right-5 text-gray-400 group-hover:text-acs-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <InstallationFilters 
        showDealer={true}
        dealers={dealers}
      />

      {/* All Orders Table Container */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">All Orders</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-200 text-gray-700 rounded-full">
            {totalCount} {totalCount === 1 ? 'order' : 'orders'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installation Number</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Req. Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Mobile</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle VIN</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charger ID</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charger Serial</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-4 py-3"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(!installations || installations.length === 0) ? (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <p className="font-semibold text-gray-700 text-base">No orders found</p>
                      <p className="text-gray-400 text-xs">No installation orders match your filter criteria or have been created yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                installations.map((inst: any) => {
                  const dealerName = inst.dealers?.name || '-';
                  const dealerDisplayId = inst.dealers?.display_id;
                  
                  const customerName = inst.customers?.name || '-';
                  const customerDisplayId = inst.customers?.display_id;
                  
                  const partnerName = inst.partners?.name || '-';
                  const partnerDisplayId = inst.partners?.display_id;
                  
                  const techName = inst.technicians?.name || '-';
                  
                  const categoryLabel = inst.category === 'INSTALLATION_AND_EARTHING' 
                    ? 'Inst + Earthing' 
                    : inst.category === 'INSTALLATION_ONLY' 
                    ? 'Inst Only' 
                    : (inst.category || '-');

                  return (
                    <tr 
                      key={inst.id} 
                      className="acs-table-row hover:bg-gray-50/80 cursor-pointer transition-colors"
                      onClick={() => setSelectedInst(inst)}
                    >
                      {/* Installation Number */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-medium text-gray-900 font-mono">
                        {inst.display_id || '-'}
                      </td>

                      {/* Order Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">
                        {inst.created_at ? new Date(inst.created_at).toLocaleDateString() : '-'}
                      </td>

                      {/* Dealer */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900">
                        <div>{dealerName}</div>
                        {dealerDisplayId && <div className="text-xs text-gray-400 font-mono">{dealerDisplayId}</div>}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-medium text-gray-700">
                        {categoryLabel}
                      </td>

                      {/* Scheduled / Requested Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">
                        {inst.scheduled_date ? new Date(inst.scheduled_date).toLocaleDateString() : '-'}
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-900">
                        <div>{customerName}</div>
                        {customerDisplayId && <div className="text-xs text-gray-400 font-mono">{customerDisplayId}</div>}
                      </td>

                      {/* Customer Mobile */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-500">
                        {inst.customers?.phone || '-'}
                      </td>

                      {/* Vehicle VIN */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-mono text-gray-700">
                        {inst.vehicles?.vin || inst.vehicles?.display_id || '-'}
                      </td>

                      {/* Charger ID */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-mono text-gray-700">
                        {inst.chargers?.display_id || '-'}
                      </td>

                      {/* Charger Serial */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm font-mono text-gray-900 font-medium">
                        {inst.chargers?.serial_number || '-'}
                      </td>

                      {/* Partner */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                        <div>{partnerName}</div>
                        {partnerDisplayId && <div className="text-xs text-gray-400 font-mono">{partnerDisplayId}</div>}
                      </td>

                      {/* Technician - ONLY Name */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-700">
                        {techName}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(inst.status)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInst(inst);
                          }}
                          className="text-acs-primary hover:text-acs-primary/80 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination totalItems={totalCount} />
      </div>

      {/* Details Side-Drawer / Modal */}
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
              className="relative z-[110] flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-5 bg-[#243B36] text-white flex justify-between items-center shrink-0 shadow-sm">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2" id="modal-title">
                    <BatteryCharging className="h-5 w-5 text-[#D6A84F]" />
                    INSTALLATION DETAILS
                  </h2>
                  <p className="text-sm text-gray-300 mt-1 font-mono">{selectedInst.display_id}</p>
                </div>
                <button 
                  onClick={() => setSelectedInst(null)} 
                  className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <span className="sr-only">Close panel</span>
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                {/* Status Banner */}
                <div className="p-4 rounded-lg bg-white border border-gray-200 shadow-sm flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider block">Current Status</span>
                    <div className="mt-1">{getStatusBadge(selectedInst.status)}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 uppercase tracking-wider block">Order Created</span>
                    <span className="text-sm font-medium text-gray-900">{selectedInst.created_at ? new Date(selectedInst.created_at).toLocaleString() : '-'}</span>
                  </div>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer Information</h3>
                    <p className="text-base font-bold text-gray-900">{selectedInst.customers?.name || '-'}</p>
                    {selectedInst.customers?.display_id && (
                      <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {selectedInst.customers.display_id}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">Phone: {selectedInst.customers?.phone || '-'}</p>
                    {selectedInst.customers?.address && (
                      <p className="text-sm text-gray-600">{selectedInst.customers.address}, {selectedInst.customers?.city}</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Dealer & Vehicle</h3>
                    <p className="text-sm font-medium text-gray-900">Dealer: {selectedInst.dealers?.name || '-'}</p>
                    {selectedInst.dealers?.display_id && (
                      <p className="text-xs text-gray-500 font-mono mb-2">Dealer ID: {selectedInst.dealers.display_id}</p>
                    )}
                    <p className="text-sm text-gray-700">Vehicle VIN: <span className="font-mono">{selectedInst.vehicles?.vin || '-'}</span></p>
                    <p className="text-sm text-gray-700">Charger ID: <span className="font-mono">{selectedInst.chargers?.display_id || '-'}</span></p>
                    <p className="text-sm text-gray-700">Charger Serial: <span className="font-mono">{selectedInst.chargers?.serial_number || '-'}</span></p>
                  </div>

                  <div className="md:col-span-2 pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assignment Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Partner Organization</p>
                        {selectedInst.partner_id ? (
                          <>
                            <p className="text-sm font-semibold text-gray-900">{selectedInst.partners?.name || 'Assigned'}</p>
                            {selectedInst.partners?.display_id && (
                              <p className="text-xs text-gray-500 font-mono">Partner ID: {selectedInst.partners.display_id}</p>
                            )}
                          </>
                        ) : (
                          <div className="mt-1 relative">
                            <p className="text-sm font-semibold text-gray-900 mb-1">Unassigned</p>
                            <div className="relative flex items-center">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                              <input
                                type="text"
                                placeholder="Search installation partner..."
                                value={partnerSearchQuery}
                                onChange={(e) => {
                                  setPartnerSearchQuery(e.target.value);
                                  setIsPartnerDropdownOpen(true);
                                }}
                                onFocus={() => setIsPartnerDropdownOpen(true)}
                                disabled={isAssigningPartner}
                                className="block w-full pl-8 pr-8 py-1.5 text-xs rounded border-gray-300 shadow-sm border focus:border-[#243B36] focus:ring-[#243B36] bg-white text-gray-900 font-medium"
                              />
                              {partnerSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPartnerSearchQuery('');
                                    setIsPartnerDropdownOpen(false);
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                  title="Clear search"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            {isPartnerDropdownOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsPartnerDropdownOpen(false)} />
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-20">
                                  {filteredPartnersList.length === 0 ? (
                                    <div className="p-3 text-xs text-gray-500 text-center">No matching active partners found</div>
                                  ) : (
                                    filteredPartnersList.map(p => (
                                      <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                          const label = `${p.name}${p.display_id ? ` — ${p.display_id}` : ''}`;
                                          setPartnerSearchQuery(label);
                                          setIsPartnerDropdownOpen(false);
                                          handleAssignPartner(selectedInst.id, p.id);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex justify-between items-center border-b last:border-b-0 border-gray-50"
                                      >
                                        <span className="font-medium text-gray-900">{p.name}</span>
                                        {p.display_id && <span className="text-gray-500 font-mono ml-2">{p.display_id}</span>}
                                      </button>
                                    ))
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Assigned Technician</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedInst.technicians?.name || 'Unassigned'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Photos & Evidence */}
                {isLoadingDetails ? (
                  <div className="text-center py-6 text-gray-500 text-sm">Loading details & evidence...</div>
                ) : (
                  <EvidenceManager 
                    installationId={selectedInst.id}
                    category={selectedInst.category}
                    existingPhotos={photos}
                    onUploadSuccess={() => loadDetails(selectedInst.id)}
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
