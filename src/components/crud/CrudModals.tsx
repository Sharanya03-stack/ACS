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

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------
// ADD BUTTON COMPONENT
// --------------------------------------------------------

export function AddEntityButton({ page, oems = [] }: { page: string, oems?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    let result: { error?: string, success?: boolean } = {};
    
    if (page === 'oems') result = await createOEM(formData);
    else if (page === 'dealerships') result = await createDealer(formData);
    else if (page === 'partners') result = await createPartner(formData);
    else if (page === 'technicians') result = await createTechnician(formData);

    setIsSubmitting(false);

    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success('Created successfully!');
      setIsOpen(false);
    }
  };

  if (!['oems', 'dealerships', 'partners', 'technicians'].includes(page)) {
    return null; // No Add button for these pages
  }

  const entityName = page.charAt(0).toUpperCase() + page.slice(1, -1); // e.g. "Oem", "Dealership", "Partner", "Technician"
  
  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-[#243B36] text-white rounded-lg text-sm font-medium hover:bg-[#1a2b27] transition-colors shadow-sm flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add {entityName}
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`Add ${entityName}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name *</label>
            <input required type="text" name="name" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
          </div>

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

          {page === 'dealerships' && (
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

          {(page === 'oems' || page === 'dealerships' || page === 'partners' || page === 'technicians') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
              <input type="text" name={page === 'technicians' ? 'phone' : 'contactPhone'} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
            </div>
          )}

          {(page === 'oems' || page === 'dealerships' || page === 'partners') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Email</label>
              <input type="email" name="contactEmail" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
            </div>
          )}

          {(page === 'oems' || page === 'dealerships' || page === 'partners' || page === 'technicians') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input type="text" name="address" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50">Cancel</button>
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

export function RowActions({ page, item, oems = [] }: { page: string, item: any, oems?: any[] }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!['oems', 'dealerships', 'partners', 'technicians'].includes(page)) {
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

          {(page === 'oems' || page === 'dealerships' || page === 'partners' || page === 'technicians') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
              <input type="text" name={page === 'technicians' ? 'phone' : 'contactPhone'} defaultValue={item.phone || item.contact_phone} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
            </div>
          )}

          {(page === 'oems' || page === 'dealerships' || page === 'partners') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Email</label>
              <input type="email" name="contactEmail" defaultValue={item.email || item.contact_email} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
            </div>
          )}

          {(page === 'oems' || page === 'dealerships' || page === 'partners' || page === 'technicians') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input type="text" name="address" defaultValue={item.address} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[#D6A84F] text-[#1C211F] rounded-md hover:bg-[#c59844] disabled:opacity-50 font-medium">
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
