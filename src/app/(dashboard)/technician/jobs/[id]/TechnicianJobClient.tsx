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
import { Camera, CheckCircle2, ChevronLeft, Loader2, PlayCircle, PlusCircle, Trash2, Image as ImageIcon } from 'lucide-react';

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

export default function TechnicianJobClient({ job, existingChecklists, existingPhotos, events = [] }: { job: any, existingChecklists: any[], existingPhotos: any[], events?: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  
  const customer = job.customers;
  const vehicle = job.vehicles;

  // Derive which sections to show based purely on backend category
  const photoSections: { id: string, title: string, description: string }[] = [];
  if (job.category === 'INSTALLATION_ONLY' || job.category === 'INSTALLATION_AND_EARTHING') {
    photoSections.push({
      id: 'INSTALLATION_PHOTO',
      title: 'Installation Photos',
      description: 'Upload photos showing the completed charger installation.'
    });
  }
  if (job.category === 'INSTALLATION_AND_EARTHING' || job.category === 'EARTHING_ONLY') {
    photoSections.push({
      id: 'EARTHING_PHOTO',
      title: 'Earthing Photos',
      description: 'Upload photos showing the earthing work.'
    });
  }
  if (job.category === 'SERVICE_CALL') {
    photoSections.push({
      id: 'SERVICE_PHOTO',
      title: 'Service Photos',
      description: 'Upload photos of the service/maintenance work.'
    });
  }
  // Fallback if no matching category
  if (photoSections.length === 0) {
    photoSections.push({
      id: 'GENERAL_PHOTO',
      title: 'General Photos',
      description: 'Upload any required photos.'
    });
  }

  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activePhotoSection, setActivePhotoSection] = useState<string | null>(null);
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showUploadMenu, setShowUploadMenu] = useState<string | null>(null);

  // Use existing checklists if any, otherwise default
  const initialChecklist = existingChecklists.length > 0 ? 
    DEFAULT_CHECKLIST.map(def => {
      const existing = existingChecklists.find(c => c.item_code === def.item_code);
      return existing ? { ...def, status: existing.status } : def;
    }) : DEFAULT_CHECKLIST;

  const [checklist, setChecklist] = useState(initialChecklist);
  const [savingChecklist, setSavingChecklist] = useState(false);

  useEffect(() => {
    // Generate signed URLs for existing photos mapping by photo ID
    const fetchPhotoUrls = async () => {
      const urls: Record<string, string> = {};
      
      for (const photo of existingPhotos) {
        const { data } = await supabase.storage
          .from('installation-evidence')
          .createSignedUrl(photo.storage_path, 3600); // 1 hour expiry
          
        if (data?.signedUrl) {
          urls[photo.id] = data.signedUrl;
        }
      }
      setPhotoUrls(urls);
    };
    
    if (existingPhotos.length > 0) {
      fetchPhotoUrls();
    }
  }, [existingPhotos, supabase.storage]);

  const handleStart = async () => {
    setStarting(true);
    const res = await startJobAction(job.id);
    if (res.success) {
      toast.success('Job started!');
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to start job');
    }
    setStarting(false);
  };

  const handleChecklistToggle = async (itemCode: string, opt: string) => {
    if (job.status !== 'IN_PROGRESS') return;
    
    const newChecklist = checklist.map(item => {
      if (item.item_code === itemCode) {
        return { ...item, status: opt };
      }
      return item;
    });
    
    setChecklist(newChecklist);
    
    setSavingChecklist(true);
    await saveChecklistAction(job.id, newChecklist);
    setSavingChecklist(false);
  };

  const triggerUploadMenu = (sectionId: string) => {
    if (job.status !== 'IN_PROGRESS') return;
    setActivePhotoSection(sectionId);
    setShowUploadMenu(sectionId);
  };

  const handleTakePhoto = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
    setShowUploadMenu(null);
  };

  const handleGallery = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.click();
    }
    setShowUploadMenu(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activePhotoSection || !e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    e.target.value = ''; // Reset input
    
    setUploadingState(prev => ({ ...prev, [activePhotoSection]: true }));
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('installationId', job.id);
      formData.append('category', activePhotoSection); // Uses the simplified backend category
      
      const res = await uploadEvidence(formData);
      if (res.error) {
        toast.error(`Failed to upload ${file.name}: ${res.error}`);
      } else {
        toast.success(`Uploaded ${file.name}`);
      }
    }
    
    setUploadingState(prev => ({ ...prev, [activePhotoSection]: false }));
    setActivePhotoSection(null);
    router.refresh(); // Refresh to fetch newly uploaded photos
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Remove this photo?')) return;
    
    // Deleting photo directly via Supabase since RLS allows it before submission
    const { error } = await supabase
      .from('installation_photos')
      .delete()
      .eq('id', photoId);
      
    if (error) {
      toast.error('Failed to remove photo');
    } else {
      toast.success('Photo removed');
      router.refresh();
    }
  };

  const isChecklistComplete = checklist.every(item => !item.is_required || item.status === 'YES' || item.status === 'N/A');
  
  // Submit checks that at least 1 photo per required section is present
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isChecklistComplete) {
      toast.error('Please complete all checklist items before submitting.');
      return;
    }
    
    for (const section of photoSections) {
      const hasPhoto = existingPhotos.some(p => p.category === section.id);
      if (!hasPhoto) {
        toast.error(`Please upload at least one photo for ${section.title}`);
        return;
      }
    }

    setSubmitting(true);
    const res = await submitInstallation(job.id);
    if (res.success) {
      toast.success('Installation submitted successfully!');
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to submit installation');
      setSubmitting(false);
    }
  };

  const isFinished = job.status === 'COMPLETED' || job.status === 'REJECTED';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Hidden File Inputs for Photo Upload */}
        <input 
          type="file" 
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden" 
          ref={cameraInputRef}
          onChange={handleFileChange}
        />
        <input 
          type="file" 
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden" 
          ref={galleryInputRef}
          onChange={handleFileChange}
        />

      <div className="flex items-center justify-between">
        <Link href="/technician/dashboard" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Jobs
        </Link>
        <div className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider
          ${job.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' : ''}
          ${job.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : ''}
          ${job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : ''}
          ${job.status === 'REJECTED' ? 'bg-red-100 text-red-700' : ''}
        `}>
          {job.status.replace('_', ' ')}
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Job Details</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</p>
                <p className="font-medium text-gray-900">{customer?.name}</p>
                <p className="text-gray-600 text-sm mt-1">{customer?.phone}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</p>
                <p className="text-gray-900 text-sm mt-1">{customer?.address}, {customer?.city} {customer?.pincode}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</p>
                <p className="font-medium text-gray-900">{vehicle?.model}</p>
                <p className="text-gray-600 text-sm mt-1 font-mono text-xs">VIN: {vehicle?.vin}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheduled Date</p>
                <p className="text-gray-900 text-sm mt-1">{job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'Not scheduled'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {job.status === 'ASSIGNED' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border rounded-xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlayCircle className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to begin?</h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">Start this job to access the checklist and begin uploading evidence.</p>
          <button
            onClick={handleStart}
            disabled={starting}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-all"
          >
            {starting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <PlayCircle className="h-5 w-5 mr-2" />}
            Start Job
          </button>
        </motion.div>
      )}

      {job.status === 'REJECTED' && job.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-red-800 font-bold mb-2">Installation Rejected</h3>
          <p className="text-red-700 text-sm">{job.rejection_reason}</p>
          <p className="text-red-600 text-xs mt-4 italic">Please review the reason and correct any issues. (Note: Only an admin/dealer can reset the status to In Progress).</p>
        </div>
      )}

      {(job.status === 'IN_PROGRESS' || isFinished) && (
        <div className="space-y-6">
          {/* Checklist */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Installation Checklist</h2>
                <p className="text-sm text-gray-500 mt-1">Complete all required items.</p>
              </div>
              {savingChecklist && <Loader2 className="animate-spin h-5 w-5 text-gray-400" />}
            </div>
            <div className="divide-y">
              {checklist.map((item, index) => (
                <div key={index} className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-4 hover:bg-gray-50 transition-colors ${item.status !== 'PENDING' ? 'bg-gray-50/50' : ''}`}>
                  <p className={`text-sm flex-1 ${item.status !== 'PENDING' ? 'text-gray-900 opacity-70' : 'text-gray-900 font-medium'}`}>{item.item_name}</p>
                  <div className="flex rounded-md shadow-sm">
                    {['YES', 'NO', 'N/A'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        disabled={isFinished}
                        onClick={() => handleChecklistToggle(item.item_code, opt)}
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
          </div>

          {/* Flexible Photo Evidence System */}
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden p-6 space-y-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Evidence Photos</h2>
              <p className="text-sm text-gray-500 mt-1">Capture and upload photos for each section below.</p>
            </div>

            {photoSections.map(section => {
              const sectionPhotos = existingPhotos.filter(p => p.category === section.id);
              const isUploading = uploadingState[section.id];
              
              return (
                <div key={section.id} className="border-t pt-6 first:border-0 first:pt-0">
                  <h3 className="text-base font-bold text-gray-800">{section.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{section.description}</p>
                  
                  {/* Photo Grid */}
                  {sectionPhotos.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                      {sectionPhotos.map(photo => {
                        const url = photoUrls[photo.id];
                        return (
                          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group bg-gray-50">
                            {url ? (
                              <>
                                <Image src={url} alt={section.title} fill className="object-cover" unoptimized />
                                {!isFinished && (
                                  <button 
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
                                    title="Remove photo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-gray-400">Loading...</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Photos Button */}
                  {!isFinished && (
                    <div className="flex items-center gap-4">
                      {sectionPhotos.length > 0 && (
                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {sectionPhotos.length} photo{sectionPhotos.length !== 1 ? 's' : ''} uploaded
                        </span>
                      )}
                      
                      <button
                        onClick={() => triggerUploadMenu(section.id)}
                        disabled={isUploading}
                        className="inline-flex items-center justify-center px-4 py-2 border border-dashed border-gray-400 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
                      >
                        {isUploading ? (
                          <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Uploading...</>
                        ) : (
                          <><PlusCircle className="h-4 w-4 mr-2" /> {sectionPhotos.length > 0 ? 'Add More Photos' : 'Add Photos'}</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {job.status === 'IN_PROGRESS' && (
            <div className="bg-gray-50 border rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-900">Ready to Submit?</h3>
                <p className="text-sm text-gray-500">Ensure all checklist items are checked and photos are uploaded.</p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !isChecklistComplete}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                )}
                {submitting ? 'Submitting...' : 'Submit Installation'}
              </button>
            </div>
          )}
        </div>
      )}

      {showUploadMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Add Photos</h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <button
                onClick={handleTakePhoto}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
              >
                <Camera className="w-5 h-5 mr-2 text-gray-500" /> Take Photo
              </button>
              <button
                onClick={handleGallery}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
              >
                <ImageIcon className="w-5 h-5 mr-2 text-gray-500" /> Choose from Gallery
              </button>
              <button
                onClick={() => setShowUploadMenu(null)}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg mt-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">Add Photos</h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <button
                onClick={handleTakePhoto}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
              >
                <Camera className="w-5 h-5 mr-2 text-gray-500" /> Take Photo
              </button>
              <button
                onClick={handleGallery}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
              >
                <ImageIcon className="w-5 h-5 mr-2 text-gray-500" /> Choose from Gallery
              </button>
              <button
                onClick={() => setShowUploadMenu(null)}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg mt-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
