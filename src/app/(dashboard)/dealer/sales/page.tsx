"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSaleAction } from './actions';

export default function DealerSalesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [chargerModel, setChargerModel] = useState("7.4kW AC Wallbox");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const formData = new FormData(e.currentTarget);
    const result = await createSaleAction(formData);

    setLoading(false);

    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setSuccessMsg(`Vehicle sale recorded successfully!`);
      // Reset form natively
      (e.target as HTMLFormElement).reset();

      setTimeout(() => {
        setSuccessMsg("");
      }, 2000);
    }
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

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          Error: {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        
        {/* Customer Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Customer Details</h3>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input required type="text" name="customerName" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <input required type="tel" name="customerPhone" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Email Address</label>
              <input required type="email" name="customerEmail" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Installation Address</label>
              <input required type="text" name="customerAddress" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">City</label>
              <input required type="text" name="customerCity" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">State *</label>
              <select required name="customerState" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border bg-white">
                <option value="">Select State</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Telangana">Telangana</option>
                <option value="Delhi">Delhi</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Haryana">Haryana</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Kerala">Kerala</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Pincode</label>
              <input required type="text" name="customerPincode" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
          </div>
        </div>

        {/* Vehicle Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Vehicle Details</h3>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle Model</label>
              <input required type="text" name="vehicleModel" placeholder="e.g. Mahindra XUV400" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">VIN (Vehicle Identification Number) *</label>
              <input type="text" name="vin" placeholder="e.g. 1HGCM82633A" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border" />
            </div>
          </div>
        </div>

        {/* Charger Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Bundled Charger Details</h3>
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Charger Model</label>
              <select name="chargerModel" value={chargerModel} onChange={(e) => setChargerModel(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border bg-white">
                <option value="7.4kW AC Wallbox">7.4kW AC Wallbox</option>
                <option value="3.3kW AC Wallbox">3.3kW AC Wallbox</option>
                <option value="11kW AC Wallbox">11kW AC Wallbox</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Power Rating</label>
              <input readOnly type="text" name="chargerPower" value={chargerModel.split(' ')[0]} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-acs-primary focus:ring-acs-primary sm:text-sm p-2 border bg-gray-50 text-gray-500" />
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
