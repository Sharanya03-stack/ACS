"use client";

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { 
  createOEM, updateOEM, deactivateOrganization,
  createDealer, updateDealer,
  createPartner, updatePartner
} from '@/app/(dashboard)/admin/organizations/actions';
import { 
  createTechnician, updateTechnician, deactivateTechnician 
} from '@/app/(dashboard)/partner/technicians/actions';

import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="acs-backdrop" 
            onClick={onClose} 
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="acs-modal flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800 z-20">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
              <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// --------------------------------------------------------
// ADD BUTTON COMPONENT
// --------------------------------------------------------

import { createCustomer, createVehicle, createCharger } from '@/app/actions/entityActions';
import { createClient } from '@/utils/supabase/client';

export function AddEntityButton({ page, oems = [], userRole }: { page: string, oems?: any[], userRole?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [options, setOptions] = useState<{dealers: any[], customers: any[], installations: any[], vehicles: any[]}>({ dealers: [], customers: [], installations: [], vehicles: [] });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedDealerId, setSelectedDealerId] = useState<string>('');
  const [dealerSearchQuery, setDealerSearchQuery] = useState<string>('');
  const [isDealerDropdownOpen, setIsDealerDropdownOpen] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen && ['customers', 'vehicles', 'chargers'].includes(page)) {
      const fetchOptions = async () => {
        const supabase = createClient();
        
        // Determine role & org_id for correct dealer query scoping
        const { data: { user } } = await supabase.auth.getUser();
        let currentRole = userRole || '';
        let currentOrgId = '';
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', user.id).single();
          if (profile) {
            currentRole = profile.role;
            currentOrgId = profile.org_id;
          }
        }

        let dealerQuery = supabase.from('organizations').select('id, display_id, name').eq('type', 'DEALER').eq('status', 'ACTIVE').order('name');
        if (currentRole === 'OEM' || currentRole === 'oem') {
          if (currentOrgId) {
            dealerQuery = dealerQuery.eq('parent_org_id', currentOrgId);
          }
        }

        const [dRes, cRes, vRes, chargersRes] = await Promise.all([
          dealerQuery,
          supabase.from('customers').select('id, display_id, name, phone, dealer_id'),
          supabase.from('vehicles').select('id, display_id, vin, model, customer_id'),
          page === 'chargers' ? supabase.from('chargers').select('vehicle_id') : Promise.resolve({ data: [] })
        ]);
        
        const vehiclesWithChargers = new Set((chargersRes.data || []).map((c: any) => c.vehicle_id));
        
        setOptions({
          dealers: dRes.data || [],
          customers: cRes.data || [],
          installations: [],
          vehicles: (vRes.data || []).filter((v: any) => !vehiclesWithChargers.has(v.id))
        });
      };
      fetchOptions();
    }
  }, [isOpen, page, userRole]);

  const filteredDealers = React.useMemo(() => {
    if (!dealerSearchQuery.trim()) return options.dealers;
    const q = dealerSearchQuery.toLowerCase();
    return options.dealers.filter(d => 
      d.name?.toLowerCase().includes(q) || 
      d.display_id?.toLowerCase().includes(q)
    );
  }, [options.dealers, dealerSearchQuery]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    let result: { error?: string, success?: boolean } = {};
    
    if (page === 'oems') result = await createOEM(formData);
    else if (page === 'dealerships') result = await createDealer(formData);
    else if (page === 'partners') result = await createPartner(formData);
    else if (page === 'technicians') result = await createTechnician(formData);
    else if (page === 'customers') result = await createCustomer(formData);
    else if (page === 'vehicles') result = await createVehicle(formData);
    else if (page === 'chargers') result = await createCharger(formData);

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success('Created successfully!');
      setIsOpen(false);
      setSelectedCustomerId('');
      setSelectedDealerId('');
      setDealerSearchQuery('');
      setIsDealerDropdownOpen(false);
    }
  };

  if (!['oems', 'dealerships', 'partners', 'technicians', 'customers', 'vehicles', 'chargers'].includes(page)) {
    return null; // No Add button for these pages
  }

  const entityName = page.charAt(0).toUpperCase() + page.slice(1, -1); // e.g. "Oem", "Dealership", "Partner", "Technician"
  
  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    if (custId) {
      const cust = options.customers.find(c => c.id === custId);
      if (cust && cust.dealer_id) {
        setSelectedDealerId(cust.dealer_id);
      }
    }
  };

  const filteredCustomers = selectedDealerId 
    ? options.customers.filter(c => c.dealer_id === selectedDealerId)
    : options.customers;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-[#243B36] text-white rounded-lg text-sm font-medium hover:bg-[#1a2b27] transition-colors shadow-sm flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add {entityName}
      </button>

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setSelectedCustomerId(''); setSelectedDealerId(''); setDealerSearchQuery(''); setIsDealerDropdownOpen(false); }} title={`Add ${entityName}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Common Fields for Orgs/Techs */}
          {!['customers', 'vehicles', 'chargers'].includes(page) && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input required type="text" name="name" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
            </div>
          )}

          {/* Technicians */}
          {page === 'technicians' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input required type="email" name="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Temporary Password *</label>
                <input required type="password" name="password" minLength={6} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
            </>
          )}

          {/* Dealerships - Parent OEM selector is only shown for ACS_ADMIN */}
          {page === 'dealerships' && userRole !== 'OEM' && userRole !== 'oem' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Parent OEM *</label>
              <select required name="parentOrgId" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]">
                <option value="">Select an OEM</option>
                {oems.filter(o => o.status === 'ACTIVE').map(oem => (
                  <option key={oem.id} value={oem.id}>{oem.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Org/Tech Common */}
          {(page === 'oems' || page === 'dealerships' || page === 'partners' || page === 'technicians') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                <input type="text" name={page === 'technicians' ? 'phone' : 'contactPhone'} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              {(page !== 'technicians') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                  <input type="email" name="contactEmail" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input type="text" name="address" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
            </>
          )}

          {/* Customers */}
          {page === 'customers' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">{(page as string) === "dealerships" ? "Dealership Name *" : "Name *"}</label>
                <input required type="text" name="name" placeholder={(page as string) === "dealerships" ? "Enter dealership name" : ""} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone *</label>
                <input required type="tel" name="phone" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dealer (if Admin/OEM)</label>
                <input type="hidden" name="dealerId" value={selectedDealerId} />
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Search dealer name or DLR-XXXXXX..."
                    value={dealerSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDealerSearchQuery(val);
                      if (selectedDealerId) {
                        const selectedDealer = options.dealers.find(d => d.id === selectedDealerId);
                        const selectedLabel = selectedDealer ? `${selectedDealer.name}${selectedDealer.display_id ? ` — ${selectedDealer.display_id}` : ''}` : '';
                        if (val !== selectedLabel) {
                          setSelectedDealerId('');
                        }
                      }
                      setIsDealerDropdownOpen(true);
                    }}
                    onFocus={() => setIsDealerDropdownOpen(true)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 pr-8 focus:border-[#243B36] focus:ring-[#243B36] text-sm bg-white"
                  />
                  {(selectedDealerId || dealerSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDealerId('');
                        setDealerSearchQuery('');
                        setIsDealerDropdownOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      title="Clear selection"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {isDealerDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsDealerDropdownOpen(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-20">
                      {filteredDealers.length === 0 ? (
                        <div className="p-3 text-xs text-gray-500 text-center">No matching dealers found</div>
                      ) : (
                        filteredDealers.map(d => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => {
                              setSelectedDealerId(d.id);
                              const label = `${d.name}${d.display_id ? ` — ${d.display_id}` : ''}`;
                              setDealerSearchQuery(label);
                              setIsDealerDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex justify-between items-center ${selectedDealerId === d.id ? 'bg-gray-50 font-bold' : ''}`}
                          >
                            <span className="font-medium text-gray-900">{d.name}</span>
                            {d.display_id && <span className="text-gray-500 font-mono">{d.display_id}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input type="text" name="city" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address *</label>
                <input required type="text" name="address" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">State *</label>
                <input required type="text" name="state" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pincode *</label>
                <input required type="text" name="pincode" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
            </>
          )}

          {/* Vehicles */}
          {page === 'vehicles' && (
            <>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-2 rounded-r">
                <p className="text-xs text-blue-800">
                  Select the <strong>Dealer</strong> and <strong>Customer</strong> to register this vehicle. For a streamlined delivery registration, use <strong>New Vehicle Sale</strong>.
                </p>
              </div>
              
              {(userRole === 'OEM' || userRole === 'oem' || userRole === 'ACS_ADMIN' || userRole === 'admin') && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dealer *</label>
                  <input type="hidden" name="dealerId" value={selectedDealerId} />
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Search dealer name or DLR-XXXXXX..."
                      value={dealerSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDealerSearchQuery(val);
                        if (selectedDealerId) {
                          const selectedDealer = options.dealers.find(d => d.id === selectedDealerId);
                          const selectedLabel = selectedDealer ? `${selectedDealer.name}${selectedDealer.display_id ? ` — ${selectedDealer.display_id}` : ''}` : '';
                          if (val !== selectedLabel) {
                            setSelectedDealerId('');
                            setSelectedCustomerId('');
                          }
                        }
                        setIsDealerDropdownOpen(true);
                      }}
                      onFocus={() => setIsDealerDropdownOpen(true)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 pr-8 focus:border-[#243B36] focus:ring-[#243B36] text-sm bg-white"
                    />
                    {(selectedDealerId || dealerSearchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDealerId('');
                          setDealerSearchQuery('');
                          setSelectedCustomerId('');
                          setIsDealerDropdownOpen(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        title="Clear selection"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {isDealerDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsDealerDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto z-20">
                        {filteredDealers.length === 0 ? (
                          <div className="p-3 text-xs text-gray-500 text-center">No matching dealers found</div>
                        ) : (
                          filteredDealers.map(d => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                setSelectedDealerId(d.id);
                                const label = `${d.name}${d.display_id ? ` — ${d.display_id}` : ''}`;
                                setDealerSearchQuery(label);
                                setSelectedCustomerId('');
                                setIsDealerDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex justify-between items-center ${selectedDealerId === d.id ? 'bg-gray-50 font-bold' : ''}`}
                            >
                              <span className="font-medium text-gray-900">{d.name}</span>
                              {d.display_id && <span className="text-gray-500 font-mono">{d.display_id}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <select 
                  required 
                  name="customerId" 
                  value={selectedCustomerId} 
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36] text-sm bg-white"
                >
                  <option value="">Select Customer...</option>
                  {filteredCustomers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} {c.display_id ? `— ${c.display_id}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">VIN *</label>
                <input required type="text" name="vin" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Model *</label>
                <input required type="text" name="model" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
            </>
          )}

          {/* Chargers */}
          {page === 'chargers' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Serial Number *</label>
                <input required type="text" name="serial_number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Model *</label>
                <input required type="text" name="model" defaultValue="3.3kW Homebox Charging Kit" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Power Rating (kW) *</label>
                <input required type="number" step="0.1" name="power_rating" defaultValue="3.3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplied Date *</label>
                <input required type="date" name="supplied_date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle *</label>
                <select required name="vehicleId" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]">
                  <option value="">Select Vehicle...</option>
                  {options.vehicles.map(v => <option key={v.id} value={v.id}>{v.vin} - {v.model}</option>)}
                </select>
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-semibold text-gray-900 border-b pb-1 mb-2">Warranty (Optional)</h4>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Warranty Months</label>
                <input type="number" name="warranty_months" defaultValue="12" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input type="date" name="warranty_start_date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input type="date" name="warranty_expiry_date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
            </>
          )}

          <div className="sticky -bottom-4 -mx-4 -mb-4 bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700 flex justify-end gap-2 z-10">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#D6A84F] text-[#1C211F] rounded-md hover:bg-[#c59844] disabled:opacity-50 font-medium">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// --------------------------------------------------------
// ROW ACTIONS COMPONENT
// --------------------------------------------------------

import { updateVehicle, updateCharger } from '@/app/actions/entityActions';

export function RowActions({ item, page, oems = [], userRole }: { item: any, page: string, oems?: any[], userRole?: string }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!['oems', 'dealerships', 'partners', 'technicians', 'vehicles', 'chargers'].includes(page)) {
    return null;
  }

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this record?')) return;
    setIsDeactivating(true);
    let result: { error?: string, success?: boolean } = {};
    
    if (page === 'technicians') {
      result = await deactivateTechnician(item.id);
    } else {
      result = await deactivateOrganization(item.id);
    }

    setIsDeactivating(false);
    if (result.error) toast.error(result.error);
    else toast.success('Deactivated successfully!');
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    let result: { error?: string, success?: boolean } = {};
    
    if (page === 'oems') result = await updateOEM(item.id, formData);
    else if (page === 'dealerships') result = await updateDealer(item.id, formData);
    else if (page === 'partners') result = await updatePartner(item.id, formData);
    else if (page === 'technicians') result = await updateTechnician(item.id, formData);
    else if (page === 'vehicles') result = await updateVehicle(item.id, formData);
    else if (page === 'chargers') result = await updateCharger(item.id, formData);

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success('Updated successfully!');
      setIsEditOpen(false);
    }
  };

  const entityName = page.charAt(0).toUpperCase() + page.slice(1, -1);

  return (
    <>
      <div className="flex items-center gap-3">
        <button onClick={() => setIsEditOpen(true)} className="text-gray-400 hover:text-[#243B36] transition-colors">
          <Edit2 className="h-4 w-4" />
        </button>
        {item.status === 'ACTIVE' && (
          <button onClick={handleDeactivate} disabled={isDeactivating} className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit ${entityName}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          
          {(page === 'oems' || page === 'dealerships' || page === 'partners' || page === 'technicians') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input required type="text" name="name" defaultValue={item.name} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>

              {page === 'dealerships' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Parent OEM *</label>
                  <select required name="parentOrgId" defaultValue={item.parent_org_id} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]">
                    <option value="">Select an OEM</option>
                    {oems.filter(o => o.status === 'ACTIVE' || o.id === item.parent_org_id).map(oem => (
                      <option key={oem.id} value={oem.id}>{oem.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                <input type="text" name={page === 'technicians' ? 'phone' : 'contactPhone'} defaultValue={item.phone || item.contact_phone} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>

              {page !== 'technicians' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                  <input type="email" name="contactEmail" defaultValue={item.email || item.contact_email} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input type="text" name="address" defaultValue={item.address} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
            </>
          )}

          {page === 'vehicles' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">VIN *</label>
                <input required type="text" name="vin" defaultValue={item.vin || ""} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Model *</label>
                <input required type="text" name="model" defaultValue={item.model} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sale Date</label>
                <input type="date" name="sale_date" defaultValue={item.sale_date} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                <input type="date" name="delivery_date" defaultValue={item.delivery_date} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
            </>
          )}

          {page === 'chargers' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Serial Number *</label>
                <input required type="text" name="serial_number" defaultValue={item.serial_number || ""} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Model *</label>
                <input required type="text" name="model" defaultValue={item.model} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Power Rating (kW) *</label>
                <input required type="number" step="0.1" name="power_rating" defaultValue={item.power_rating || 7.4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplied Date</label>
                <input type="date" name="supplied_date" defaultValue={item.supplied_date} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div className="pt-2">
                <h4 className="text-sm font-semibold text-gray-900 border-b pb-1 mb-2">Warranty (Optional)</h4>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Warranty Months</label>
                <input type="number" name="warranty_months" defaultValue={item.warranty_months} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input type="date" name="warranty_start_date" defaultValue={item.warranty_start_date} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input type="date" name="warranty_expiry_date" defaultValue={item.warranty_expiry_date} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
              </div>
            </>
          )}

          <div className="sticky -bottom-4 -mx-4 -mb-4 bg-white dark:bg-gray-800 p-4 border-t dark:border-gray-700 flex justify-end gap-2 z-10">
            <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#D6A84F] text-[#1C211F] rounded-md hover:bg-[#c59844] disabled:opacity-50 font-medium">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
