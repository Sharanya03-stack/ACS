"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { startJobAction, saveChecklistAction } from '../actions';
import { uploadEvidence } from '@/app/actions/uploadEvidence';
import { submitInstallation } from '@/app/actions/submitInstallation';
import { createClient } from '@/utils/supabase/client';

const DEFAULT_CHECKLIST = [
  { item_code: 'c1', item_name: 'Charger received', status: 'PENDING', is_required: true },
  { item_code: 'c2', item_name: 'Charger serial number verified', status: 'PENDING', is_required: true },
  { item_code: 'c3', item_name: 'Mounting completed', status: 'PENDING', is_required: true },
  { item_code: 'c4', item_name: 'Wiring completed', status: 'PENDING', is_required: true },
  { item_code: 'c5', item_name: 'MCB installed', status: 'PENDING', is_required: true },
  { item_code: 'c6', item_name: 'Earthing checked', status: 'PENDING', is_required: true },
  { item_code: 'c7', item_name: 'Voltage checked', status: 'PENDING', is_required: true },
  { item_code: 'c8', item_name: 'Charger powered on', status: 'PENDING', is_required: true },
  { item_code: 'c9', item_name: 'Charging test completed', status: 'PENDING', is_required: true },
  { item_code: 'c10', item_name: 'Installation completed', status: 'PENDING', is_required: true },
];

const BASE_PHOTO_CATEGORIES = [
  'Before Installation',
  'Electrical Panel',
  'MCB',
  'Charger Mounting',
  'Charger Serial Number',
  'Wiring',
  'Final Installed Charger',
  'Charger Powered On',
  'Charging Test'
];

const EARTHING_PHOTO_CATEGORY = 'Earthing';

export default function TechnicianJobClient({ job, existingChecklists, existingPhotos, events = [] }: { job: any, existingChecklists: any[], existingPhotos: any[], events?: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  
  const customer = job.customers;
  const vehicle = job.vehicles;

  // Form State
  const [otp, setOtp] = useState('');
  
  // Use existing checklists if any, otherwise default
  const initialChecklist = existingChecklists.length > 0 ? 
    DEFAULT_CHECKLIST.map(def => {
      const found = existingChecklists.find(e => e.item_code === def.item_code);
      return found ? { ...def, status: found.status } : def;
    }) : DEFAULT_CHECKLIST;

  const [checklist, setChecklist] = useState(initialChecklist);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  
  // Photos State
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const requiredCategories = job.category === 'INSTALLATION_ONLY'
    ? BASE_PHOTO_CATEGORIES
    : [...BASE_PHOTO_CATEGORIES.slice(0, 3), EARTHING_PHOTO_CATEGORY, ...BASE_PHOTO_CATEGORIES.slice(3)];

  useEffect(() => {
    // Generate public or signed URLs for existing photos
    const fetchPhotoUrls = async () => {
      const urls: Record<string, string> = {};
      
      for (const photo of existingPhotos) {
        // Because the bucket is private, we must use createSignedUrl
        const { data } = await supabase.storage
          .from('installation-evidence')
          .createSignedUrl(photo.storage_path, 3600); // 1 hour expiry
          
        if (data?.signedUrl) {
          urls[photo.category] = data.signedUrl;
        }
      }
      
      setPhotoUrls(urls);
    };
    
    if (existingPhotos.length > 0) {
      fetchPhotoUrls();
    }
  }, [existingPhotos, supabase.storage]);

  // Debounced auto-save for checklist
  useEffect(() => {
    if (job.status === 'IN_PROGRESS' || job.status === 'REVISIT_REQUIRED') {
      const timeoutId = setTimeout(async () => {
        await saveChecklistAction(job.id, checklist);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [checklist, job.status, job.id]);

  const isCompleted = ['UNDER_VERIFICATION', 'VERIFIED', 'COMPLETED'].includes(job.status);
  // Also support old spaced enum values if any exist
  const isStarted = job.status === 'IN_PROGRESS';
  const isCompletedLegacy = ['UNDER_VERIFICATION', 'VERIFIED', 'COMPLETED'].includes(job.status);
  const isFinished = isCompleted || isCompletedLegacy;

  const handleStartJob = async () => {
    const res = await startJobAction(job.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Job started!");
    }
  };

  const getTimelineLabel = (event: any) => {
    switch (event.action) {
      case 'CREATED': return 'Order Placed';
      case 'TECHNICIAN_ASSIGNED': return 'Engineer Assigned';
      case 'STATUS_CHANGED': 
        const status = event.new_value?.status;
        if (status === 'IN_PROGRESS') return 'Engineer En Route';
        if (status === 'UNDER_VERIFICATION') return 'Installed';
        if (status === 'VERIFIED') return 'Installed';
        if (status === 'COMPLETED') return 'Closed';
        return null; // Hide other status changes
      default: return null;
    }
  };

  const handleChecklistChange = (index: number, status: string) => {
    const newChecklist = [...checklist];
    newChecklist[index].status = status;
    setChecklist(newChecklist);
  };

  const handlePhotoClick = (category: string) => {
    if (isFinished) return;
    setActiveCategory(category);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeCategory || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    e.target.value = ''; // Reset input
    
    setUploadingState(prev => ({ ...prev, [activeCategory]: true }));
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('installationId', job.id);
    formData.append('category', activeCategory);
    
    const res = await uploadEvidence(formData);
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || 'Photo uploaded');
    }
    
    setUploadingState(prev => ({ ...prev, [activeCategory]: false }));
    setActiveCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '4821') {
      toast.error("Invalid OTP! For demo purposes, use '4821'.");
      return;
    }

    if (checklist.some(c => c.status === 'PENDING' || c.status === 'NO')) {
      toast.error("Please complete the installation checklist successfully before submitting.");
      return;
    }
    
    const uploadedCategories = new Set(existingPhotos.map(p => p.category));
    const missingPhotos = requiredCategories.filter(c => !uploadedCategories.has(c));

    if (missingPhotos.length > 0) {
      toast.error(`Missing required photos: ${missingPhotos.join(', ')}`);
      return;
    }

    const res = await submitInstallation(job.id);
    if (res.error) {
      toast.error(res.error, { duration: 5000 });
    } else {
      toast.success(res.message || 'Installation submitted successfully!');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <div className="max-w-md mx-auto py-6 px-4 pb-24">
      <Link href="/technician/dashboard" className="text-[#243B36] hover:text-[#D6A84F] transition-colors text-sm font-medium mb-4 inline-block">&larr; Back to Jobs</Link>
      
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6 relative">
        <div className="h-32 relative bg-[#243B36]">
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
            <div>
              <p className="text-white/80 text-xs uppercase tracking-wider font-semibold mb-1">Installation Job</p>
              <h1 className="text-xl font-bold text-white">{job.id}</h1>
            </div>
            <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-full bg-white text-gray-900 shadow-sm">
              {job.status}
            </span>
          </div>
        </div>
        <div className="p-4 bg-white relative z-10">
          <p className="font-bold text-gray-900">{customer?.name}</p>
          <p className="text-sm text-gray-600 mb-2">{customer?.phone}</p>
          <p className="text-sm text-gray-600 mb-4">{customer?.address}, {customer?.city}, {customer?.pincode}</p>
          <div className="text-sm px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
            <span className="font-semibold text-gray-700">Vehicle:</span> {vehicle?.model} (VIN: {vehicle?.vin})
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Installation Timeline</h2>
        {events && events.length > 0 ? (
          <div className="flow-root">
            <ul className="-mb-8">
              {events
                .filter(e => getTimelineLabel(e) !== null) // Only show mapped events
                .map((event, eventIdx, filteredEvents) => (
                <li key={event.id}>
                  <div className="relative pb-8">
                    {eventIdx !== filteredEvents.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-acs-primary/10 flex items-center justify-center ring-8 ring-white">
                          <svg className="w-4 h-4 text-acs-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 flex justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{getTimelineLabel(event)}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                          <p>{new Date(event.created_at).toLocaleDateString()}</p>
                          <p>{new Date(event.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No events recorded yet.</p>
        )}
      </motion.div>

      {!isFinished && !isStarted && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          {job.status === 'REVISIT_REQUIRED' && job.rejection_reason && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded p-4">
              <h3 className="text-red-800 font-bold mb-1">Revisit Required</h3>
              <p className="text-red-600 text-sm">{job.rejection_reason}</p>
              <p className="text-red-500 text-xs mt-2">Please fix the issues below and resubmit the checklist and evidence.</p>
            </div>
          )}

          {!isStarted && !isFinished && (
            <button 
              onClick={handleStartJob}
              className={`w-full py-4 rounded-xl text-white font-bold tracking-wider shadow-lg transition-colors ${
                job.status === 'REVISIT_REQUIRED' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#243B36] hover:bg-[#1a2b27]'
              }`}
            >
            {job.status === 'REVISIT_REQUIRED' ? 'FIX REJECTION (START)' : 'START INSTALLATION'}
            </button>
          )}
        </motion.div>
      )}

      {(isStarted || isFinished) && (
        <motion.form 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onSubmit={handleSubmit} 
          className="space-y-6"
        >
          {/* Checklist */}
          <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Safety & Quality Checklist</h2>
            <div className="space-y-4">
              {checklist.map((item, index) => (
                <div key={item.item_code} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <p className="text-sm text-gray-700 flex-1">{item.item_name}</p>
                  <div className="flex rounded-md shadow-sm">
                    {['YES', 'NO', 'N/A'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        disabled={isFinished}
                        onClick={() => handleChecklistChange(index, opt)}
                        className={`px-3 py-1 text-xs border transition-colors ${
                          item.status === opt 
                            ? (opt === 'YES' || opt === 'N/A' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500')
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        } ${opt === 'YES' ? 'rounded-l-md' : opt === 'N/A' ? 'rounded-r-md' : ''}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Photos */}
          <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-lg font-bold text-gray-900">Installation Evidence</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Upload required photos for this installation. Allowed formats: JPEG, PNG, WEBP (Max 5MB).
            </p>
            
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />

            <div className="grid grid-cols-2 gap-4">
              {requiredCategories.map((category, index) => {
                const url = photoUrls[category];
                const isUploading = uploadingState[category];
                
                return (
                  <div 
                    key={index} 
                    onClick={() => handlePhotoClick(category)}
                    className={`border border-dashed rounded-lg p-2 flex flex-col items-center justify-center text-center relative overflow-hidden aspect-square transition-all ${
                      url 
                        ? 'border-green-500 bg-green-50' 
                        : isFinished 
                          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' 
                          : 'border-gray-300 hover:border-[#D6A84F] hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    {isUploading ? (
                      <div className="h-6 w-6 rounded-full border-2 border-gray-300 border-t-[#243B36] animate-spin mb-2" />
                    ) : url ? (
                      <Image 
                        src={url}
                        alt={category}
                        fill
                        className="object-cover opacity-90"
                      />
                    ) : (
                      <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    
                    {!url && !isUploading && (
                      <span className="text-[10px] text-gray-600 font-medium leading-tight z-10 pointer-events-none">
                        {category}
                      </span>
                    )}
                    
                    {url && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-bold">Retake</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* OTP */}
          {!isFinished && (
            <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Customer Confirmation</h2>
              <p className="text-xs text-gray-500 mb-4">Please ask the customer for the 4-digit OTP sent to their mobile number ({customer?.phone}).<br/><br/><strong>NOTE:</strong> This OTP is a prototype verification mechanism for the demo.</p>
              <input 
                type="text" 
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Demo OTP: 4821" 
                className="w-full text-center text-2xl tracking-widest font-mono p-3 border border-gray-300 rounded-md focus:ring-[#243B36] focus:border-[#243B36] transition-shadow"
                required
              />
            </motion.div>
          )}

          {!isFinished && (
            <motion.div variants={itemVariants}>
              <button 
                type="submit"
                className="w-full bg-[#243B36] text-white font-bold py-4 rounded-lg shadow-sm hover:bg-[#1a2b27] transition-colors mt-4"
              >
                SUBMIT INSTALLATION
              </button>
            </motion.div>
          )}
        </motion.form>
      )}
    </div>
  );
}
