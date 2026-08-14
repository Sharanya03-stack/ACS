"use client";

import React, { useState } from 'react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Customer, Vehicle, Charger } from '@/lib/types';

export default function DealerSalesPage() {
  const { user } = useAuth();
  const { createVehicleSale, dealers } = useData();
  const router = useRouter();
  const dealer = dealers.find(d => d.id === user?.roleId);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    // Customer
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    customerCity: '',
    customerState: '',
    customerPincode: '',
    // Vehicle
    vehicleModel: '',
    registrationNumber: '',
    // Charger
    chargerModel: '7.4kW AC Wallbox',
    chargerPower: '7.4kW',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealer) return;
    setLoading(true);

    // Generate IDs
    const custId = `CUS-${Math.floor(100000 + Math.random() * 900000)}`;
    const vehId = `VIN${Math.floor(100000000 + Math.random() * 900000000)}`;
    const chgId = `ACS-WLX-${Math.floor(100000 + Math.random() * 900000)}`;

    const customer: Customer = {
      id: custId,
      name: formData.customerName,
      phone: formData.customerPhone,
      email: formData.customerEmail,
      address: formData.customerAddress,
      city: formData.customerCity,
      state: formData.customerState,
      pincode: formData.customerPincode,
      dealerId: dealer.id
    };

    const vehicle: Vehicle = {
      id: vehId,
      model: formData.vehicleModel,
      registrationNumber: formData.registrationNumber,
      saleDate: new Date().toISOString().split('T')[0],
      deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +2 days
      customerId: custId,
      dealerId: dealer.id,
      oemId: dealer.oemId
    };

    const charger: Charger = {
      id: chgId,
      model: formData.chargerModel,
      power: formData.chargerPower,
      suppliedDate: new Date().toISOString().split('T')[0],
      vehicleId: vehId,
      customerId: custId
    };

    const instId = createVehicleSale(customer, vehicle, charger);
    
    setLoading(false);
    setSuccessMsg(`Installation request ${instId} created successfully!`);
    
    // Reset form
    setFormData({
      customerName: '', customerPhone: '', customerEmail: '', customerAddress: '', customerCity: '', customerState: '', customerPincode: '',
      vehicleModel: '', registrationNumber: '', chargerModel: '7.4kW AC Wallbox', chargerPower: '7.4kW'
    });

    setTimeout(() => {
      setSuccessMsg("");
      router.push('/dealer/installations');
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Vehicle Sale & Installation Request</h1>
        <p className="mt-1 text-sm text-gray-500">Record a new EV sale and automatically trigger a charger installation request.</p>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        
        {/* Customer Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Customer Details</h3>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input required type="text" name="customerName" value={formData.customerName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input required type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input required type="email" name="customerEmail" value={formData.customerEmail} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Installation Address</label>
              <input required type="text" name="customerAddress" value={formData.customerAddress} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input required type="text" name="customerCity" value={formData.customerCity} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State</label>
              <input required type="text" name="customerState" value={formData.customerState} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pincode</label>
              <input required type="text" name="customerPincode" value={formData.customerPincode} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
          </div>
        </div>

        {/* Vehicle Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Vehicle Details</h3>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle Model</label>
              <input required type="text" name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} placeholder="e.g. Mahindra XUV400" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Registration Number</label>
              <input required type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleChange} placeholder="e.g. MH12AB1234" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
          </div>
        </div>

        {/* Charger Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Bundled Charger Details</h3>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Charger Model</label>
              <select name="chargerModel" value={formData.chargerModel} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border bg-white">
                <option value="7.4kW AC Wallbox">7.4kW AC Wallbox</option>
                <option value="3.3kW AC Wallbox">3.3kW AC Wallbox</option>
                <option value="11kW AC Wallbox">11kW AC Wallbox</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Power Rating</label>
              <input readOnly type="text" name="chargerPower" value={formData.chargerPower} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border bg-gray-50 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center rounded-md border border-transparent bg-acs-primary py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-acs-primary/90 focus:outline-none focus:ring-2 focus:ring-acs-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Submit Sale & Request Installation'}
          </button>
        </div>
      </form>
    </div>
  );
}
