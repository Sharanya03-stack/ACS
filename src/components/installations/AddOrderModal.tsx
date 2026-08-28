"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createInstallationOrder } from '@/app/actions/createInstallationOrder';
import toast from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';

export function AddOrderModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [chargers, setChargers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    const supabase = createClient();
    
    // Get user role
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile) setUserRole(profile.role);
    }

    // Fetch partners for Admin/OEM to assign
    const { data: partnersData } = await supabase.from('organizations').select('id, name').eq('type', 'PARTNER');
    if (partnersData) setPartners(partnersData);

    // Fetch chargers without an installation
    const { data, error } = await supabase.from('chargers').select(`
      id, serial_number, model, power_rating,
      customers ( name ),
      vehicles ( vin, model ),
      installations ( id )
    `).or('power_rating.eq.3.3,power_rating.eq.3.3kW');

    if (data) {
       // Filter out chargers that already have an installation
       const unassigned = data.filter(c => !c.installations || c.installations.length === 0);
       setChargers(unassigned);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const res = await createInstallationOrder(formData);
    setSubmitting(false);
    
    if (res.success) {
      toast.success('Order created successfully');
      onClose();
    } else {
      toast.error(res.error || 'Failed to create order');
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
      <div className="relative z-10 flex flex-col w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#243B36] text-white flex justify-between items-center">
          <h2 className="text-lg font-bold">Add Installation Order</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin h-8 w-8 text-[#243B36]" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Charger</label>
                {chargers.length === 0 ? (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    No available chargers found. Please create a charger/sale first.
                  </div>
                ) : (
                  <select name="charger_id" required className="w-full border rounded-md p-2 text-sm focus:ring-[#243B36] focus:border-[#243B36]">
                    <option value="">-- Select a Charger --</option>
                    {chargers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.model} [{c.power_rating}] (SN: {c.serial_number}) - {c.customers?.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Category</label>
                <select name="category" required className="w-full border rounded-md p-2 text-sm focus:ring-[#243B36] focus:border-[#243B36]">
                  <option value="INSTALLATION_AND_EARTHING">Installation & Earthing</option>
                  <option value="INSTALLATION_ONLY">Installation Only</option>
                  <option value="EARTHING_ONLY">Earthing Only</option>
                  <option value="SERVICE_CALL">Service/Maintenance Call</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Date (Optional)</label>
                <input type="date" name="scheduled_date" className="w-full border rounded-md p-2 text-sm focus:ring-[#243B36] focus:border-[#243B36]" />
              </div>

              {(userRole === 'ACS_ADMIN' || userRole === 'OEM') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign Partner (Optional)</label>
                  <select name="partner_id" className="w-full border rounded-md p-2 text-sm focus:ring-[#243B36] focus:border-[#243B36]">
                    <option value="">-- Do not assign yet --</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea name="remarks" rows={3} placeholder="Any special instructions or notes..." className="w-full border rounded-md p-2 text-sm focus:ring-[#243B36] focus:border-[#243B36]"></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md">Cancel</button>
                <button type="submit" disabled={submitting || chargers.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-[#243B36] hover:bg-[#1a2b27] rounded-md disabled:opacity-50 flex items-center gap-2">
                  {submitting && <Loader2 className="animate-spin h-4 w-4" />}
                  {submitting ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
