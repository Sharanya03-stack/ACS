"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { createInstallationOrder } from '@/app/actions/createInstallationOrder';
import { createCharger, createCustomer, createVehicle } from '@/app/actions/entityActions';
import toast from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';

export function AddOrderModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [chargers, setChargers] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedChargerId, setSelectedChargerId] = useState('');
  
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
  const [isPartnerDropdownOpen, setIsPartnerDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userOrgId, setUserOrgId] = useState('');
  
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [creatingCustomerLoading, setCreatingCustomerLoading] = useState(false);

  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);
  const [creatingVehicleLoading, setCreatingVehicleLoading] = useState(false);

  const [isCreatingCharger, setIsCreatingCharger] = useState(false);
  const [creatingChargerLoading, setCreatingChargerLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setSelectedPartnerId('');
    setPartnerSearchQuery('');
    setIsPartnerDropdownOpen(false);
    const supabase = createClient();
    
    // Get user role
    const { data: { user } } = await supabase.auth.getUser();
    let currentRole = '';
    let currentOrgId = '';
    
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', user.id).single();
      if (profile) {
        currentRole = profile.role;
        currentOrgId = profile.org_id;
        setUserRole(profile.role);
        setUserOrgId(profile.org_id);
      }
    }

    // Fetch partners for Admin/OEM to assign
    const { data: partnersData } = await supabase.from('organizations').select('id, display_id, name').eq('type', 'PARTNER').order('name');
    if (partnersData) setPartners(partnersData);

    // Fetch dealers if Admin/OEM
    if (currentRole === 'ACS_ADMIN' || currentRole === 'OEM') {
      let dealerQuery = supabase.from('organizations').select('id, name').eq('type', 'DEALER').order('name');
      if (currentRole === 'OEM') {
        dealerQuery = dealerQuery.eq('parent_org_id', currentOrgId);
      }
      const { data: dealersData } = await dealerQuery;
      if (dealersData) setDealers(dealersData);
    }

    // Fetch customers, vehicles, and unassigned chargers
    const [custRes, vehRes, charRes] = await Promise.all([
      supabase.from('customers').select('id, display_id, name, dealer_id').order('name'),
      supabase.from('vehicles').select('id, display_id, vin, model, customer_id'),
      supabase.from('chargers').select(`
        id, display_id, serial_number, model, power_rating, customer_id, vehicle_id,
        installations ( id )
      `)
    ]);

    if (custRes.data) setCustomers(custRes.data);
    if (vehRes.data) setVehicles(vehRes.data);
    if (charRes.data) {
       const unassigned = charRes.data.filter(c => !c.installations || c.installations.length === 0);
       setChargers(unassigned);
    }
    setLoading(false);
  };

  const availableVehicles = useMemo(() => vehicles.filter(v => v.customer_id === selectedCustomerId), [vehicles, selectedCustomerId]);
  const availableChargers = useMemo(() => chargers.filter(c => c.vehicle_id === selectedVehicleId && c.customer_id === selectedCustomerId), [chargers, selectedVehicleId, selectedCustomerId]);
  
  const filteredPartners = useMemo(() => {
    if (!partnerSearchQuery.trim()) return partners;
    const q = partnerSearchQuery.toLowerCase();
    return partners.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.display_id?.toLowerCase().includes(q)
    );
  }, [partners, partnerSearchQuery]);

  // Reset dependent dropdowns when customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      setSelectedVehicleId('');
      setSelectedChargerId('');
      setIsCreatingVehicle(false);
      setIsCreatingCharger(false);
    }
  }, [selectedCustomerId]);

  // Reset dependent dropdowns when vehicle changes
  useEffect(() => {
    if (selectedVehicleId) {
      setSelectedChargerId('');
      setIsCreatingCharger(false);
    }
  }, [selectedVehicleId]);
  
  // Auto-select charger if there is only one available for the selected vehicle
  useEffect(() => {
    if (selectedVehicleId && availableChargers.length === 1 && !selectedChargerId) {
      setSelectedChargerId(availableChargers[0].id);
    }
  }, [selectedVehicleId, availableChargers, selectedChargerId]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set('charger_id', selectedChargerId); // Ensure selected charger is passed
    const res = await createInstallationOrder(formData);
    setSubmitting(false);
    
    if (res.success) {
      toast.success('Order created successfully');
      router.refresh();
      onClose();
    } else {
      toast.error(res.error || 'Failed to create order');
    }
  }

  async function handleCreateCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreatingCustomerLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const res = await createCustomer(formData);
    
    if (res.error) {
      toast.error(res.error);
      setCreatingCustomerLoading(false);
    } else {
      toast.success('Customer created successfully');
      
      if (res.data) {
        setCustomers(prev => [...prev, res.data]);
        setSelectedCustomerId(res.data.id);
      }
      setIsCreatingCustomer(false);
      setCreatingCustomerLoading(false);
    }
  }

  async function handleCreateVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreatingVehicleLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('customerId', selectedCustomerId);
    
    // Automatically inject the correct dealer ID from the selected customer
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (customer && customer.dealer_id) {
      formData.set('dealerId', customer.dealer_id);
    }

    const res = await createVehicle(formData);
    
    if (res.error) {
      toast.error(res.error);
      setCreatingVehicleLoading(false);
    } else {
      toast.success('Vehicle created successfully');
      
      if (res.data) {
        setVehicles(prev => [...prev, res.data]);
        setSelectedVehicleId(res.data.id);
      }
      setIsCreatingVehicle(false);
      setCreatingVehicleLoading(false);
    }
  }

  async function handleCreateCharger(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const rawPower = formData.get('power_rating') as string;
    const numericPower = parseFloat(rawPower);
    if (!rawPower || isNaN(numericPower) || numericPower <= 0) {
      toast.error('Please enter a valid power rating greater than 0 kW (e.g. 3.3, 7.4, 11, 22).');
      return;
    }

    setCreatingChargerLoading(true);
    formData.set('customerId', selectedCustomerId);
    formData.set('vehicleId', selectedVehicleId);
    
    const res = await createCharger(formData);
    
    if (res.error) {
      toast.error(res.error);
      setCreatingChargerLoading(false);
    } else {
      toast.success('Charger created successfully');
      
      if (res.data) {
        // Mock the installations array since it's newly created and has none
        const newCharger = { ...res.data, installations: [] };
        setChargers(prev => [...prev, newCharger]);
        setSelectedChargerId(res.data.id);
      }
      setIsCreatingCharger(false);
      setCreatingChargerLoading(false);
    }
  }

  return (
    <div className="acs-backdrop flex items-center justify-center p-4 sm:p-6">
      <div className="acs-modal max-w-xl">
        <div className="px-6 py-4 bg-gray-900 text-white flex justify-between items-center">
          <h2 className="text-lg font-bold">Add Installation Order</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[85vh] overflow-y-auto bg-white">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-gray-900" />
            </div>
          ) : (
            <div className="space-y-6">
              
              <div className="space-y-6">
                {/* 1. Customer Section */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">1. Customer</h3>
                  
                  {isCreatingCustomer ? (
                    <form onSubmit={handleCreateCustomer} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                          <input type="text" name="name" required className="w-full border rounded-md p-2 text-sm bg-white" placeholder="Customer Name" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                          <input type="text" name="phone" required className="w-full border rounded-md p-2 text-sm bg-white" placeholder="Phone Number" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                          <input type="email" name="email" className="w-full border rounded-md p-2 text-sm bg-white" placeholder="Email (Optional)" />
                        </div>
                        {(userRole === 'ACS_ADMIN' || userRole === 'OEM') && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Dealer</label>
                            <select name="dealerId" required className="w-full border rounded-md p-2 text-sm bg-white">
                              <option value="">-- Select Dealer --</option>
                              {dealers.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="col-span-1 sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                          <input type="text" name="address" required className="w-full border rounded-md p-2 text-sm bg-white" placeholder="Street Address" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                          <input type="text" name="city" required className="w-full border rounded-md p-2 text-sm bg-white" placeholder="City" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                            <input type="text" name="state" required className="w-full border rounded-md p-2 text-sm bg-white" placeholder="State" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Pincode</label>
                            <input type="text" name="pincode" required className="w-full border rounded-md p-2 text-sm bg-white" placeholder="Pincode" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsCreatingCustomer(false)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" disabled={creatingCustomerLoading} className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-black rounded flex items-center gap-2">
                          {creatingCustomerLoading && <Loader2 className="animate-spin h-3 w-3" />}
                          Create Customer
                        </button>
                      </div>
                    </form>
                  ) : customers.length > 0 ? (
                    <div>
                      <select 
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full border rounded-md p-2 text-sm focus:ring-gray-900 focus:border-gray-900 bg-white"
                      >
                        <option value="">-- Select Customer --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <div className="mt-2 text-right">
                        <button type="button" onClick={() => setIsCreatingCustomer(true)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                          + Create New Customer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-300 rounded-md p-4 text-center bg-white">
                      <p className="text-sm text-gray-600 mb-3">No customers available.</p>
                      <button type="button" onClick={() => setIsCreatingCustomer(true)} className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                        + Create Customer
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Vehicle Section */}
                <div className={`p-4 rounded-lg border ${!selectedCustomerId ? 'bg-gray-50/50 border-gray-100 opacity-60 pointer-events-none' : 'bg-gray-50 border-gray-200'}`}>
                  <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">2. Vehicle</h3>
                  
                  {!selectedCustomerId ? (
                    <p className="text-sm text-gray-500 italic">Select a customer first</p>
                  ) : isCreatingVehicle ? (
                    <form onSubmit={handleCreateVehicle} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">VIN (Vehicle Identification Number)</label>
                        <input type="text" name="vin" required className="w-full border rounded-md p-2 text-sm bg-white" placeholder="Enter VIN" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Model</label>
                        <input type="text" name="model" required className="w-full border rounded-md p-2 text-sm bg-white" placeholder="e.g. Nexon EV" />
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsCreatingVehicle(false)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" disabled={creatingVehicleLoading} className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-black rounded flex items-center gap-2">
                          {creatingVehicleLoading && <Loader2 className="animate-spin h-3 w-3" />}
                          Create Vehicle
                        </button>
                      </div>
                    </form>
                  ) : availableVehicles.length > 0 ? (
                    <div>
                      <select 
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="w-full border rounded-md p-2 text-sm focus:ring-gray-900 focus:border-gray-900 bg-white"
                      >
                        <option value="">-- Select Vehicle --</option>
                        {availableVehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.model} (VIN: {v.vin})</option>
                        ))}
                      </select>
                      <div className="mt-2 text-right">
                        <button type="button" onClick={() => setIsCreatingVehicle(true)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                          + Add New Vehicle
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-300 rounded-md p-4 text-center bg-white">
                      <p className="text-sm text-gray-600 mb-3">No vehicles available for this customer.</p>
                      <button type="button" onClick={() => setIsCreatingVehicle(true)} className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                        + Add Vehicle
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Charger Section */}
                <div className={`p-4 rounded-lg border ${!selectedVehicleId ? 'bg-gray-50/50 border-gray-100 opacity-60 pointer-events-none' : 'bg-gray-50 border-gray-200'}`}>
                  <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">3. Charger</h3>
                  
                  {!selectedVehicleId ? (
                    <p className="text-sm text-gray-500 italic">Select a vehicle first</p>
                  ) : isCreatingCharger ? (
                    <form onSubmit={handleCreateCharger} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Charger Model</label>
                        <input type="text" name="model" required defaultValue="3.3kW Homebox Charging Kit" className="w-full border rounded-md p-2 text-sm bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Serial Number</label>
                        <input type="text" name="serial_number" required className="w-full border rounded-md p-2 text-sm bg-white" placeholder="e.g. CHG-3333" />
                      </div>
                                              <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Power Rating (kW) *</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            min="0.1" 
                            name="power_rating" 
                            required 
                            defaultValue="3.3" 
                            placeholder="e.g. 3.3, 7.4, 11, 22" 
                            className="w-full border rounded-md p-2 text-sm bg-white focus:ring-gray-900 focus:border-gray-900" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Warranty Months</label>
                          <input type="number" name="warranty_months" defaultValue="12" className="w-full border rounded-md p-2 text-sm bg-white" />
                        </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsCreatingCharger(false)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border hover:bg-gray-100 rounded">Cancel</button>
                        <button type="submit" disabled={creatingChargerLoading} className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-black rounded flex items-center gap-2">
                          {creatingChargerLoading && <Loader2 className="animate-spin h-3 w-3" />}
                          Create Charger
                        </button>
                      </div>
                    </form>
                  ) : availableChargers.length > 0 ? (
                    <div>
                      <select 
                        value={selectedChargerId}
                        onChange={(e) => setSelectedChargerId(e.target.value)}
                        className="w-full border rounded-md p-2 text-sm focus:ring-gray-900 focus:border-gray-900 bg-white"
                      >
                        <option value="">-- Select Charger --</option>
                        {availableChargers.map(c => {
                          const ratingStr = c.power_rating 
                            ? (String(c.power_rating).toLowerCase().includes('kw') ? c.power_rating : `${c.power_rating} kW`)
                            : '3.3 kW';
                          return (
                            <option key={c.id} value={c.id}>
                              {c.display_id || c.serial_number} — {ratingStr} — Serial: {c.serial_number} ({c.model})
                            </option>
                          );
                        })}
                      </select>
                      <div className="mt-2 text-right">
                        <button type="button" onClick={() => setIsCreatingCharger(true)} className="text-xs font-medium text-blue-600 hover:text-blue-800">
                          + Create New Charger
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-gray-300 rounded-md p-4 text-center bg-white">
                      <p className="text-sm text-gray-600 mb-3">No available chargers found.</p>
                      <button type="button" onClick={() => setIsCreatingCharger(true)} className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                        + Create Charger
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Installation Details Section */}
              <div className={`p-4 rounded-lg border ${!selectedChargerId ? 'bg-gray-50/50 border-gray-100 opacity-60 pointer-events-none' : 'bg-gray-50 border-gray-200'}`}>
                <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">4. Installation Details</h3>
                
                {!selectedChargerId ? (
                  <p className="text-sm text-gray-500 italic">Select a charger first</p>
                ) : (
                  <form id="orderForm" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Installation Category</label>
                      <select name="category" required className="w-full border rounded-md p-2 text-sm focus:ring-gray-900 focus:border-gray-900 bg-white">
                        <option value="INSTALLATION_AND_EARTHING">Installation & Earthing (Photos + Earthing Required)</option>
                        <option value="INSTALLATION_ONLY">Installation Only (Photos Required)</option>
                        <option value="EARTHING_ONLY">Earthing Only</option>
                        <option value="SERVICE_CALL">Service/Maintenance Call</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Requested Date (Optional)</label>
                      <input type="date" name="scheduled_date" className="w-full border rounded-md p-2 text-sm focus:ring-gray-900 focus:border-gray-900 bg-white" />
                    </div>

                    {(userRole === 'ACS_ADMIN' || userRole === 'OEM') && (
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign Partner (Optional)</label>
                        <input type="hidden" name="partner_id" value={selectedPartnerId} />
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="Type partner name or ID..."
                            value={
                              selectedPartnerId 
                                ? (partners.find(p => p.id === selectedPartnerId)?.name 
                                   ? `${partners.find(p => p.id === selectedPartnerId)?.name}${partners.find(p => p.id === selectedPartnerId)?.display_id ? ` (${partners.find(p => p.id === selectedPartnerId)?.display_id})` : ''}`
                                   : partnerSearchQuery)
                                : partnerSearchQuery
                            }
                            onChange={(e) => {
                              if (selectedPartnerId) {
                                setSelectedPartnerId('');
                              }
                              setPartnerSearchQuery(e.target.value);
                              setIsPartnerDropdownOpen(true);
                            }}
                            onFocus={() => setIsPartnerDropdownOpen(true)}
                            className="w-full border rounded-md p-2 pr-8 text-sm focus:ring-gray-900 focus:border-gray-900 bg-white"
                          />
                          {(selectedPartnerId || partnerSearchQuery) && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPartnerId('');
                                setPartnerSearchQuery('');
                                setIsPartnerDropdownOpen(false);
                              }}
                              className="absolute right-2 text-gray-400 hover:text-gray-600 p-1"
                              title="Clear selection"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {isPartnerDropdownOpen && !selectedPartnerId && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {filteredPartners.length === 0 ? (
                              <div className="p-2.5 text-xs text-gray-500 text-center">No matching partners found</div>
                            ) : (
                              filteredPartners.map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPartnerId(p.id);
                                    setPartnerSearchQuery(p.name);
                                    setIsPartnerDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between border-b last:border-b-0 border-gray-50"
                                >
                                  <span className="font-medium text-gray-900">{p.name}</span>
                                  {p.display_id && (
                                    <span className="text-xs text-gray-400 font-mono ml-2">{p.display_id}</span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                      <textarea name="remarks" rows={3} placeholder="Any special instructions or notes..." className="w-full border rounded-md p-2 text-sm focus:ring-gray-900 focus:border-gray-900 bg-white"></textarea>
                    </div>
                  </form>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex justify-end gap-2 border-t mt-6 bg-white sticky bottom-0">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md">Cancel</button>
                <button 
                  type="submit" 
                  form="orderForm"
                  disabled={submitting || !selectedChargerId || isCreatingCharger || isCreatingVehicle || isCreatingCustomer} 
                  className="px-6 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-md disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="animate-spin h-4 w-4" />}
                  {submitting ? 'Creating...' : 'Create Order'}
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
