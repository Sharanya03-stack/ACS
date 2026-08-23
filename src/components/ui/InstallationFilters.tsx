"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, Filter, X } from 'lucide-react';

interface InstallationFiltersProps {
  showOem?: boolean;
  showDealer?: boolean;
  showPartner?: boolean;
  showTechnician?: boolean;
  oems?: any[];
  dealers?: any[];
  partners?: any[];
  technicians?: any[];
  onExport?: (params: any) => void;
}

export function InstallationFilters({
  showOem = false,
  showDealer = false,
  showPartner = false,
  showTechnician = false,
  oems = [],
  dealers = [],
  partners = [],
  technicians = [],
  onExport
}: InstallationFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [oemId, setOemId] = useState(searchParams.get('oem_id') || '');
  const [dealerId, setDealerId] = useState(searchParams.get('dealer_id') || '');
  const [partnerId, setPartnerId] = useState(searchParams.get('partner_id') || '');
  const [technicianId, setTechnicianId] = useState(searchParams.get('technician_id') || '');
  
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync state when URL changes externally (e.g. back button)
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setStatus(searchParams.get('status') || '');
    setCategory(searchParams.get('category') || '');
    setOemId(searchParams.get('oem_id') || '');
    setDealerId(searchParams.get('dealer_id') || '');
    setPartnerId(searchParams.get('partner_id') || '');
    setTechnicianId(searchParams.get('technician_id') || '');
  }, [searchParams]);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Always reset to page 1 when filtering
    params.set('page', '1');
    
    if (search) params.set('search', search); else params.delete('search');
    if (status) params.set('status', status); else params.delete('status');
    if (category) params.set('category', category); else params.delete('category');
    if (oemId) params.set('oem_id', oemId); else params.delete('oem_id');
    if (dealerId) params.set('dealer_id', dealerId); else params.delete('dealer_id');
    if (partnerId) params.set('partner_id', partnerId); else params.delete('partner_id');
    if (technicianId) params.set('technician_id', technicianId); else params.delete('technician_id');

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setCategory('');
    setOemId('');
    setDealerId('');
    setPartnerId('');
    setTechnicianId('');
    router.push(pathname); // clear all search params
  };

  const handleExport = () => {
    if (onExport) {
      const params: any = {};
      if (search) params.search = search;
      if (status) params.status = status;
      if (category) params.category = category;
      if (oemId) params.oem_id = oemId;
      if (dealerId) params.dealer_id = dealerId;
      if (partnerId) params.partner_id = partnerId;
      if (technicianId) params.technician_id = technicianId;
      onExport(params);
    } else {
      window.location.href = `/api/export?${searchParams.toString()}`;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search Name, VIN, Serial #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </button>
          
          <button
            onClick={applyFilters}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Apply
          </button>
          
          {(search || status || category || oemId || dealerId || partnerId || technicianId) && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center p-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="Clear all filters"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Export CSV
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="PENDING_ASSIGNMENT">Pending Assignment</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="UNDER_VERIFICATION">Under Verification</option>
              <option value="REVISIT_REQUIRED">Revisit Required</option>
              <option value="VERIFIED">Verified</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">All Categories</option>
              <option value="INSTALLATION_ONLY">Installation Only</option>
              <option value="INSTALLATION_AND_EARTHING">Installation + Earthing</option>
            </select>
          </div>

          {showOem && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OEM</label>
              <select
                value={oemId}
                onChange={(e) => setOemId(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All OEMs</option>
                {oems.map(oem => (
                  <option key={oem.id} value={oem.id}>{oem.name}</option>
                ))}
              </select>
            </div>
          )}

          {showDealer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dealer</label>
              <select
                value={dealerId}
                onChange={(e) => setDealerId(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Dealers</option>
                {dealers.map(dealer => (
                  <option key={dealer.id} value={dealer.id}>{dealer.name}</option>
                ))}
              </select>
            </div>
          )}

          {showPartner && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Installation Partner</label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Partners</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>{partner.name}</option>
                ))}
              </select>
            </div>
          )}

          {showTechnician && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Technicians</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>{tech.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
