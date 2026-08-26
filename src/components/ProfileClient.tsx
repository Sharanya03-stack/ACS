"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Building, Briefcase, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { updateProfileAction } from '@/app/(dashboard)/[role]/profile/actions';
import { isValidPhone } from '@/utils/validation';

export interface ProfileData {
  id: string;
  name: string;
  role: string;
  phone?: string;
  org_id?: string;
  address?: string;
}

export default function ProfileClient({ initialUser }: { initialUser: ProfileData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  
  // Local state for form fields
  const [formData, setFormData] = useState({
    name: initialUser?.name || '',
    email: `${initialUser?.id}@acsenergy.com`,
    phone: initialUser?.phone || '+91 98765 43210',
    address: initialUser?.address || 'Mumbai, Maharashtra',
    department: initialUser?.role === 'TECHNICIAN' ? 'Field Operations' : 'Management',
    bio: 'Enterprise user account for ACS Energy platform.'
  });

  useEffect(() => {
    setFormData({
      name: initialUser?.name || '',
      email: `${initialUser?.id}@acsenergy.com`,
      phone: initialUser?.phone || '+91 98765 43210',
      address: initialUser?.address || 'Mumbai, Maharashtra',
      department: initialUser?.role === 'TECHNICIAN' ? 'Field Operations' : 'Management',
      bio: 'Enterprise user account for ACS Energy platform.'
    });
  }, [initialUser]);

  const handleSave = async () => {
    if (formData.phone && formData.phone.trim() !== '' && !isValidPhone(formData.phone)) {
      toast.error('Invalid phone number format. Must be a 10-digit number starting with 6-9.');
      return;
    }

    setIsSaving(true);
    
    try {
      const result = await updateProfileAction({
        name: formData.name,
        phone: formData.phone.trim(),
        address: formData.address
      });
      
      setIsSaving(false);
      
      if (result.error) {
        console.error('Profile update failed:', result.error);
        toast.error('Failed to update profile: ' + result.error);
        return;
      }
      
      setIsEditing(false);
      toast.success('Profile updated successfully!', {
        style: {
          background: '#243B36',
          color: '#fff',
          fontWeight: '500'
        },
        iconTheme: {
          primary: '#D6A84F',
          secondary: '#243B36',
        }
      });
    } catch (e: any) {
      setIsSaving(false);
      console.error('Profile update threw error:', e);
      toast.error('Failed to update profile: ' + (e.message || 'Network error'));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex justify-between items-end"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-sm text-gray-600">View and manage your personal information.</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-[#243B36] text-white rounded-lg text-sm font-medium hover:bg-[#1a2b27] transition-colors shadow-sm"
          >
            Edit Profile
          </button>
        )}
      </motion.div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Cover */}
        <div className="h-32 bg-gradient-to-r from-[#243B36] to-[#1a2b27] relative">
          <div className="absolute -bottom-12 left-8">
            <div className="h-24 w-24 rounded-full bg-white p-1 shadow-md">
              <div className="h-full w-full rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-[#D6A84F] relative group cursor-pointer overflow-hidden">
                <User className="h-10 w-10 text-gray-400 group-hover:opacity-0 transition-opacity" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name} 
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#243B36] focus:ring-[#243B36] sm:text-sm h-10 border px-3" 
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{formData.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  Role & Department
                </label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#243B36]/10 text-[#243B36]">
                    {initialUser?.role}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {formData.department}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  Bio / Notes
                </label>
                {isEditing ? (
                  <textarea 
                    name="bio"
                    rows={4} 
                    value={formData.bio}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#243B36] focus:ring-[#243B36] sm:text-sm border p-3" 
                  />
                ) : (
                  <p className="text-gray-600 text-sm">{formData.bio}</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  Email Address
                </label>
                {isEditing ? (
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email} 
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#243B36] focus:ring-[#243B36] sm:text-sm h-10 border px-3" 
                  />
                ) : (
                  <p className="text-gray-900">{formData.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  Phone Number
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    name="phone"
                    value={formData.phone} 
                    onChange={handleChange}
                    inputMode="numeric"
                    maxLength={10}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#243B36] focus:ring-[#243B36] sm:text-sm h-10 border px-3" 
                  />
                ) : (
                  <p className="text-gray-900">{formData.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  Address
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    name="address"
                    value={formData.address} 
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#243B36] focus:ring-[#243B36] sm:text-sm h-10 border px-3" 
                  />
                ) : (
                  <p className="text-gray-900">{formData.address}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3"
          >
            <button 
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  ...formData,
                  name: initialUser?.name || ''
                });
              }}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-[#1C211F] bg-[#D6A84F] hover:bg-[#c59844] rounded-md transition-colors flex items-center gap-2 min-w-[120px] justify-center shadow-sm"
            >
              {isSaving ? (
                <div className="h-4 w-4 rounded-full border-2 border-black/20 border-t-black animate-spin" />
              ) : (
                'Save Profile'
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
