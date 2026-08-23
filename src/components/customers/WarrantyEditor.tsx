"use client";

import React, { useState } from 'react';
import { FileText, Edit2 } from 'lucide-react';
import { updateChargerWarranty } from '@/app/actions/updateChargerWarranty';
import toast from 'react-hot-toast';

interface WarrantyProps {
  charger: any;
  profile: any;
  onUpdated: () => void;
}

export function WarrantyEditor({ charger, profile, onUpdated }: WarrantyProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [months, setMonths] = useState(charger?.warranty_months?.toString() || '');
  const [startDate, setStartDate] = useState(charger?.warranty_start_date || '');
  const [expiryDate, setExpiryDate] = useState(charger?.warranty_expiry_date || '');

  const canEdit = profile?.role === 'ACS_ADMIN' || profile?.role === 'OEM';

  // Automatically calculate expiry if months and start date are set
  const handleMonthsOrStartChange = (m: string, s: string) => {
    setMonths(m);
    setStartDate(s);
    if (m && s) {
      const start = new Date(s);
      start.setMonth(start.getMonth() + parseInt(m));
      setExpiryDate(start.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charger) return;
    
    setLoading(true);
    const res = await updateChargerWarranty(charger.id, {
      months: months ? parseInt(months) : null,
      startDate: startDate || null,
      expiryDate: expiryDate || null
    });
    setLoading(false);

    if (res.success) {
      toast.success('Warranty updated successfully');
      setIsEditing(false);
      onUpdated();
    } else {
      toast.error(res.error || 'Failed to update warranty');
    }
  };

  if (!isEditing) {
    return (
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-600" /> Warranty Information
          </h3>
          {canEdit && (
            <button onClick={() => setIsEditing(true)} className="text-sm text-[#243B36] hover:underline flex items-center gap-1">
              <Edit2 className="h-3 w-3" /> Edit
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-y-4 gap-x-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
            <p className="text-sm font-medium">
              {!charger?.warranty_expiry_date ? (
                <span className="text-gray-500">NOT SET</span>
              ) : new Date(charger.warranty_expiry_date) >= new Date() ? (
                <span className="text-green-600 font-bold">ACTIVE</span>
              ) : (
                <span className="text-red-600 font-bold">EXPIRED</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Duration (Months)</p>
            <p className="text-sm text-gray-900">{charger?.warranty_months ? `${charger.warranty_months} months` : 'NOT SET'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Start Date</p>
            <p className="text-sm text-gray-900">{charger?.warranty_start_date ? new Date(charger.warranty_start_date).toLocaleDateString() : 'NOT SET'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Expiry Date</p>
            <p className="text-sm text-gray-900">{charger?.warranty_expiry_date ? new Date(charger.warranty_expiry_date).toLocaleDateString() : 'NOT SET'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-8">
      <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
        <FileText className="h-4 w-4 text-green-600" /> Edit Warranty
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase font-semibold">Duration (Months)</label>
            <input 
              type="number" 
              value={months}
              onChange={(e) => handleMonthsOrStartChange(e.target.value, startDate)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
              placeholder="e.g. 36"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase font-semibold">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => handleMonthsOrStartChange(months, e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 uppercase font-semibold">Expiry Date (Manual Override)</label>
            <input 
              type="date" 
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Expiry is auto-calculated based on start date and months, but can be overridden for extensions.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={loading} className="px-3 py-1.5 bg-[#243B36] text-white rounded text-sm disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Warranty'}
          </button>
        </div>
      </form>
    </div>
  );
}
