"use client";

import React, { useState } from 'react';
import { ShieldCheck, Edit2 } from 'lucide-react';
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

  // For the edit form we initialize with existing DB values
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

  // Helper to accurately display months, prioritizing exact date difference over potentially corrupt warranty_months
  const getDisplayMonths = () => {
    if (charger?.warranty_start_date && charger?.warranty_expiry_date) {
      const start = new Date(charger.warranty_start_date);
      const end = new Date(charger.warranty_expiry_date);
      if (end >= start) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const roundedMonths = Math.round(diffDays / 30.436875);
        if (roundedMonths > 0) return `${roundedMonths} months`;
      }
    }
    // Fallback if one date is missing, but avoid returning negative values
    if (charger?.warranty_months && charger.warranty_months > 0) {
      return `${charger.warranty_months} months`;
    }
    return 'NOT SET';
  };

  if (!isEditing) {
    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" /> Warranty Details
          </h4>
          {canEdit && (
            <button onClick={() => setIsEditing(true)} className="text-xs text-[#243B36] hover:underline flex items-center gap-1 font-semibold">
              <Edit2 className="h-3 w-3" /> Edit Warranty
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-4">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Status</p>
            <p className="text-sm font-medium">
              {!charger?.warranty_expiry_date ? (
                <span className="text-gray-500 italic">Warranty not set</span>
              ) : new Date(charger.warranty_expiry_date) >= new Date() ? (
                <span className="text-green-600 font-bold">ACTIVE</span>
              ) : (
                <span className="text-red-600 font-bold">EXPIRED</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Duration</p>
            <p className="text-sm text-gray-900">{getDisplayMonths()}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Start Date</p>
            <p className="text-sm text-gray-900">{charger?.warranty_start_date ? new Date(charger.warranty_start_date).toLocaleDateString() : 'NOT SET'}</p>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Expiry Date</p>
            <p className="text-sm text-gray-900">{charger?.warranty_expiry_date ? new Date(charger.warranty_expiry_date).toLocaleDateString() : 'NOT SET'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green-600" /> Edit Warranty
        </h4>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Duration (Months)</label>
            <input 
              type="number" 
              value={months}
              onChange={(e) => handleMonthsOrStartChange(e.target.value, startDate)}
              className="block w-full rounded-md border-gray-300 border p-2 text-sm"
              placeholder="e.g. 36"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => handleMonthsOrStartChange(months, e.target.value)}
              className="block w-full rounded-md border-gray-300 border p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-1">Expiry Date</label>
            <input 
              type="date" 
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="block w-full rounded-md border-gray-300 border p-2 text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">Expiry is auto-calculated based on start date and months, but can be overridden manually.</p>
        
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
          <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-sm border rounded-md bg-white">Cancel</button>
          <button type="submit" disabled={loading} className="px-3 py-1.5 text-sm bg-green-600 text-white font-medium rounded-md hover:bg-green-700">
            {loading ? 'Saving...' : 'Save Warranty'}
          </button>
        </div>
      </form>
    </div>
  );
}
