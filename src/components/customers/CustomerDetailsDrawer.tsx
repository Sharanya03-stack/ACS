"use client";

import React, { useEffect, useState } from 'react';
import { getCustomerDetails } from '@/app/actions/getCustomerDetails';
import { X, User, Car, Zap, Wrench, Clock, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function CustomerDetailsDrawer({ customerId, onClose }: { customerId: string, onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="fixed inset-0 overflow-hidden z-[60]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <section className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="w-screen max-w-2xl transform transition-all">
            <div className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
              <div className="px-4 py-6 bg-[#243B36] text-white border-b sm:px-6 flex justify-between items-center sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <User className="h-5 w-5 text-[#D6A84F]" />
                    Customer Details
                  </h2>
                  <p className="text-sm text-gray-300 mt-1">{customer?.name || 'Loading...'}</p>
                </div>
                <button onClick={onClose} className="text-gray-300 hover:text-white">
                  <span className="sr-only">Close panel</span>
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="relative flex-1 px-4 py-6 sm:px-6 bg-gray-50">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#243B36]"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* 1. Customer Section */}
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                        <User className="h-4 w-4 text-[#D6A84F]" /> Contact Information
                      </h3>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Full Name</p>
                          <p className="text-sm font-medium text-gray-900">{customer?.name || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Phone</p>
                          <p className="text-sm text-gray-900">{customer?.phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Email</p>
                          <p className="text-sm text-gray-900">{customer?.email || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase font-semibold">Location</p>
                          <p className="text-sm text-gray-900">{customer?.city}, {customer?.state} - {customer?.pincode}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 uppercase font-semibold">Address</p>
                          <p className="text-sm text-gray-900">{customer?.address || '-'}</p>
                        </div>
                      </div>
                    </div>

                    {/* 2 & 3. Vehicle & Charger Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                          <Car className="h-4 w-4 text-blue-600" /> Vehicle
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Model</p>
                            <p className="text-sm text-gray-900">{vehicle?.model || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Registration / VIN</p>
                            <p className="text-sm text-gray-900 font-mono bg-gray-100 inline-block px-1 rounded">{vehicle?.vin || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Sale Date</p>
                            <p className="text-sm text-gray-900">{vehicle?.sale_date ? new Date(vehicle.sale_date).toLocaleDateString() : '-'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-yellow-500" /> Charger
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Model & Power</p>
                            <p className="text-sm text-gray-900">{charger?.model || '-'} ({charger?.power_rating || '-'})</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Serial Number</p>
                            <p className="text-sm text-gray-900 font-mono bg-gray-100 inline-block px-1 rounded">{charger?.serial_number || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Supplied Date</p>
                            <p className="text-sm text-gray-900">{charger?.supplied_date ? new Date(charger.supplied_date).toLocaleDateString() : '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Installation & Technician Section */}
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-purple-600" /> Installation Details
                      </h3>
                      {inst ? (
                        <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                            <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              {inst.status}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Category</p>
                            <p className="text-sm text-gray-900 font-medium">{inst.category === 'INSTALLATION_AND_EARTHING' ? 'Installation + Earthing' : 'Installation Only'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Partner</p>
                            <p className="text-sm text-gray-900">{inst.partner_name || 'Unassigned'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Technician</p>
                            <p className="text-sm text-gray-900">{inst.technician_name || 'Unassigned'}</p>
                          </div>
                          {inst.rejection_reason && (
                            <div className="col-span-2 p-3 bg-red-50 text-red-800 rounded border border-red-200 text-sm">
                              <strong>Revisit Reason:</strong> {inst.rejection_reason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No installation records found.</p>
                      )}
                    </div>

                    {/* 5. Timeline Section */}
                    {inst && (
                      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-4 mb-6 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-600" /> Installation Timeline
                        </h3>
                        <div className="relative border-l-2 border-[#243B36] ml-3 space-y-8">
                          <div className="relative pl-6">
                            <span className="absolute -left-2.5 top-1 h-5 w-5 rounded-full border-2 border-white bg-[#D6A84F]"></span>
                            <h4 className="text-sm font-semibold text-gray-900">Request Created</h4>
                            <p className="text-xs text-gray-500">{new Date(inst.created_at).toLocaleString()}</p>
                          </div>
                          
                          <div className={`relative pl-6 ${inst.partner_id ? 'opacity-100' : 'opacity-40'}`}>
                            <span className={`absolute -left-2.5 top-1 h-5 w-5 rounded-full border-2 border-white ${inst.partner_id ? 'bg-[#D6A84F]' : 'bg-gray-300'}`}></span>
                            <h4 className="text-sm font-semibold text-gray-900">Partner Assigned</h4>
                            {inst.partner_id && <p className="text-xs text-gray-500">{inst.partner_name}</p>}
                          </div>

                          <div className={`relative pl-6 ${inst.technician_id ? 'opacity-100' : 'opacity-40'}`}>
                            <span className={`absolute -left-2.5 top-1 h-5 w-5 rounded-full border-2 border-white ${inst.technician_id ? 'bg-[#D6A84F]' : 'bg-gray-300'}`}></span>
                            <h4 className="text-sm font-semibold text-gray-900">Technician Assigned</h4>
                            {inst.technician_id && <p className="text-xs text-gray-500">{inst.technician_name}</p>}
                          </div>

                          <div className={`relative pl-6 ${inst.started_at ? 'opacity-100' : 'opacity-40'}`}>
                            <span className={`absolute -left-2.5 top-1 h-5 w-5 rounded-full border-2 border-white ${inst.started_at ? 'bg-[#D6A84F]' : 'bg-gray-300'}`}></span>
                            <h4 className="text-sm font-semibold text-gray-900">Installation Started</h4>
                            {inst.started_at && <p className="text-xs text-gray-500">{new Date(inst.started_at).toLocaleString()}</p>}
                          </div>

                          <div className={`relative pl-6 ${inst.completed_at ? 'opacity-100' : 'opacity-40'}`}>
                            <span className={`absolute -left-2.5 top-1 h-5 w-5 rounded-full border-2 border-white ${inst.completed_at ? 'bg-[#D6A84F]' : 'bg-gray-300'}`}></span>
                            <h4 className="text-sm font-semibold text-gray-900">Installation Submitted</h4>
                            {inst.completed_at && <p className="text-xs text-gray-500">{new Date(inst.completed_at).toLocaleString()}</p>}
                          </div>

                          <div className={`relative pl-6 ${['VERIFIED', 'COMPLETED'].includes(inst.status) ? 'opacity-100' : 'opacity-40'}`}>
                            <span className={`absolute -left-2.5 top-1 h-5 w-5 rounded-full border-2 border-white ${['VERIFIED', 'COMPLETED'].includes(inst.status) ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                            <h4 className="text-sm font-semibold text-gray-900">ACS Verified</h4>
                            {inst.verified_at && <p className="text-xs text-gray-500">{new Date(inst.verified_at).toLocaleString()}</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 6. Warranty Placeholder */}
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-8">
                      <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600" /> Warranty Information
                      </h3>
                      <p className="text-sm text-gray-500 italic">
                        Warranty tracking is managed by the OEM system. Active from date of verification.
                      </p>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
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
      {isOpen && <CustomerDetailsDrawer customerId={id} onClose={() => setIsOpen(false)} />}
    </>
  );
}
