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
      if (page === 'partners') {
        toast.success('Partner account created successfully! The Partner can now log in using their Contact Email and Temporary Password.', { duration: 6000 });
      } else if (page === 'oems') {
        toast.success('OEM account created successfully! The OEM user can now log in using their Contact Email and Temporary Password.', { duration: 6000 });
      } else if (page === 'dealerships') {
        toast.success('Dealership account created successfully! The Dealership user can now log in using their Contact Email and Temporary Password.', { duration: 6000 });
      } else {
        toast.success('Created successfully!');
      }
      setIsOpen(false);
    }
  };

  if (!['oems', 'dealerships', 'partners', 'technicians', 'customers', 'vehicles', 'chargers'].includes(page)) {
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
              <label className="block text-sm font-medium text-gray-700">Parent OEM (Name / Email / ID) *</label>
              <input required type="text" name="parentOrgId" placeholder="OEM Name / Contact Email / Display ID" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
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
                  <label className="block text-sm font-medium text-gray-700">Contact Email {['partners', 'oems', 'dealerships'].includes(page) ? '*' : ''}</label>
                  <input required={['partners', 'oems', 'dealerships'].includes(page)} type="email" name="contactEmail" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
                </div>
              )}
              {['partners', 'oems', 'dealerships'].includes(page) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Temporary Password *</label>
                  <input required type="password" name="password" minLength={6} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
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
              <div>
                <label className="block text-sm font-medium text-gray-700">Dealer (Name / Email / ID)</label>
                <input type="text" name="dealerId" placeholder="Dealer Name / Contact Email / Display ID" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
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
              {(userRole === 'OEM' || userRole === 'oem' || userRole === 'ACS_ADMIN' || userRole === 'admin') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Dealer (Name / Email / ID)</label>
                  <input type="text" name="dealerId" placeholder="Dealer Name / Contact Email / Display ID" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Customer (Name / Phone / ID) *</label>
                <input required type="text" name="customerId" placeholder="Customer Name / Phone / Display ID" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
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
                <label className="block text-sm font-medium text-gray-700">Vehicle (VIN or ID) *</label>
                <input required type="text" name="vehicleId" placeholder="Vehicle VIN or Display ID" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
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
                  <label className="block text-sm font-medium text-gray-700">Parent OEM (Name / Email / ID) *</label>
                  <input required type="text" name="parentOrgId" defaultValue={item.parent_org_id || ""} placeholder="OEM Name / Contact Email / Display ID" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 focus:border-[#243B36] focus:ring-[#243B36]" />
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
