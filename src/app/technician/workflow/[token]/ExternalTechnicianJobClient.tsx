"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Camera, CheckCircle2, Loader2, PlayCircle, PlusCircle, Trash2, Image as ImageIcon } from 'lucide-react';
import { externalStartJob, externalSaveChecklist, externalUploadPhoto, externalDeletePhoto, externalSubmitInstallation, externalGetSignedUrls } from '@/app/actions/externalTechnician';

const DEFAULT_CHECKLIST = [
  { item_code: 'c1', item_name: 'Charger received', status: 'PENDING', is_required: true },
  { item_code: 'c2', item_name: 'Charger serial number verified', status: 'PENDING', is_required: true },
  { item_code: 'c3', item_name: 'Customer location verified', status: 'PENDING', is_required: true },
  { item_code: 'c4', item_name: 'Cabling route verified', status: 'PENDING', is_required: true },
  { item_code: 'c5', item_name: 'Electrical panel check complete', status: 'PENDING', is_required: true },
  { item_code: 'c6', item_name: 'Charger mounting completed', status: 'PENDING', is_required: true },
  { item_code: 'c7', item_name: 'Grid connection established', status: 'PENDING', is_required: true },
  { item_code: 'c8', item_name: 'Functional testing completed', status: 'PENDING', is_required: true },
  { item_code: 'c9', item_name: 'Customer onboarding completed', status: 'PENDING', is_required: true }
];

export default function ExternalTechnicianJobClient({ 
  token,
  job, 
  existingChecklists, 
  existingPhotos 
}: { 
  token: string,
  job: any, 
  existingChecklists: any[], 
  existingPhotos: any[] 
}) {
  const router = useRouter();

  const photoSections: { id: string, title: string, description: string }[] = [];
  if (job.category === 'INSTALLATION_ONLY' || job.category === 'INSTALLATION_EARTHING') {
    photoSections.push({
      id: 'INSTALLATION_PHOTO',
      title: 'Installation Photos',
      description: 'Upload photos showing the completed charger installation.'
    });
  }
  if (job.category === 'INSTALLATION_EARTHING') {
    photoSections.push({
      id: 'EARTHING_PHOTO',
      title: 'Earthing Photos',
      description: 'Upload photos showing the earthing work.'
    });
  }
  if (photoSections.length === 0) {
    photoSections.push({
      id: 'GENERAL_PHOTO',
      title: 'General Photos',
      description: 'Upload any required photos.'
    });
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [activePhotoSection, setActivePhotoSection] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const initialChecklist = existingChecklists.length > 0 ?
    DEFAULT_CHECKLIST.map(def => {
      const existing = existingChecklists.find(c => c.item_code === def.item_code);
      return existing ? { ...def, status: existing.status } : def;
    }) : DEFAULT_CHECKLIST;

  const [checklist, setChecklist] = useState(initialChecklist);
  const [savingChecklist, setSavingChecklist] = useState(false);

  useEffect(() => {
    const fetchUrls = async () => {
      const paths = existingPhotos.map(p => p.storage_path);
      if (paths.length > 0) {
        const res = await externalGetSignedUrls(token, paths);
        if (res.success && res.urls) {
          const newUrls: Record<string, string> = {};
          existingPhotos.forEach(p => {
            if (res.urls![p.storage_path]) {
              newUrls[p.id] = res.urls![p.storage_path];
            }
          });
          setPhotoUrls(newUrls);
        }
      }
    };
    fetchUrls();
  }, [existingPhotos, token]);

  const handleStart = async () => {
    setStarting(true);
    const res = await externalStartJob(token);
    if (res.success) {
      toast.success('Job started');
    } else {
      toast.error(res.error || 'Failed to start job');
    }
    setStarting(false);
  };

  const handleChecklistToggle = async (itemCode: string, opt: string) => {
    const newChecklist = checklist.map(item => {
      if (item.item_code === itemCode) return { ...item, status: opt };
      return item;
    });
    setChecklist(newChecklist);
    
    setSavingChecklist(true);
    await externalSaveChecklist(token, newChecklist);
    setSavingChecklist(false);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activePhotoSection || !e.target.files || e.target.files.length === 0) return;
    
    setUploadingState(prev => ({ ...prev, [activePhotoSection]: true }));
    
    try {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);
      formData.append('trackingToken', token);
      formData.append('category', activePhotoSection);

      const res = await externalUploadPhoto(formData);
      if (res.success) {
        toast.success('Photo uploaded');
      } else {
        toast.error(res.error || 'Upload failed');
      }
    } catch (err) {
      toast.error('Upload failed');
    }
    
    setUploadingState(prev => ({ ...prev, [activePhotoSection]: false }));
    setActivePhotoSection(null);
    router.refresh();
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Remove this photo?')) return;
    
    const res = await externalDeletePhoto(token, photoId);
    if (res.success) {
      toast.success('Photo removed');
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to remove photo');
    }
  };

  const isChecklistComplete = checklist.every(item => !item.is_required || item.status === 'YES' || item.status === 'N/A');

  const handleSubmit = async () => {
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

    if (!confirm('Are you sure you want to submit this installation?')) return;
    
    setSubmitting(true);
    const res = await externalSubmitInstallation(token);
    if (res.success) {
      toast.success('Installation submitted successfully!');
      router.refresh();
    } else {
      toast.error(res.error || 'Submission failed');
    }
    setSubmitting(false);
  };

  const isActive = job.status === 'IN_PROGRESS' || job.status === 'REVISIT_REQUIRED';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hidden File Inputs for Photo Upload */}
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleUploadPhoto} 
      />
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
        ref={cameraInputRef} 
        onChange={handleUploadPhoto} 
      />

      <div className="bg-[#243B36] text-white p-4 sticky top-0 z-10 shadow-md">
        <h1 className="text-xl font-bold">ACS Installation</h1>
        <p className="text-sm opacity-90">{job.category?.replace(/_/g, ' ')}</p>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6 mt-4">
        
        {/* Job Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{job.customers?.[0]?.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{job.customers?.[0]?.address}, {job.customers?.[0]?.city}</p>
              {job.customers?.[0]?.phone && <p className="text-sm text-gray-600 mt-1">Phone: {job.customers[0].phone}</p>}
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                {job.status.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 font-medium">Vehicle</p>
              <p className="text-gray-900">{job.vehicles?.[0]?.model || 'N/A'}</p>
              {job.vehicles?.[0]?.vin && <p className="text-xs text-gray-500 mt-0.5">VIN: {job.vehicles[0].vin}</p>}
            </div>
            <div>
              <p className="text-gray-500 font-medium">Charger</p>
              <p className="text-gray-900">{job.chargers?.[0]?.model || 'N/A'}</p>
              {job.chargers?.[0]?.power_rating && <p className="text-xs text-gray-500 mt-0.5">{job.chargers[0].power_rating} kW</p>}
            </div>
          </div>
        </div>

        {!isActive ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to Start?</h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">Start this job to access the checklist and begin uploading evidence.</p>
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full bg-[#243B36] hover:bg-[#1a2b27] text-white py-4 rounded-xl font-bold text-lg transition-colors flex justify-center items-center"
            >
              {starting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Start Installation'}
            </button>
          </div>
        ) : (
          <>
            {/* Checklist */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Installation Checklist</h2>
                {savingChecklist && <Loader2 className="animate-spin h-5 w-5 text-gray-400" />}
              </div>
              <div className="space-y-4">
                {checklist.map((item, index) => (
                  <div key={item.item_code} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {index + 1}. {item.item_name}
                          {item.is_required && <span className="text-red-500 ml-1">*</span>}
                        </p>
                      </div>
                      <div className="flex bg-gray-100 rounded-lg p-1 shrink-0">
                        {['YES', 'NO', 'N/A'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => handleChecklistToggle(item.item_code, opt)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                              item.status === opt
                                ? opt === 'YES' || opt === 'N/A' ? 'bg-green-600 text-white shadow-sm' : 'bg-red-600 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Flexible Photo Evidence System */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-bold text-gray-900">Evidence Photos</h2>
              <p className="text-sm text-gray-500 mt-1 mb-6">Capture and upload photos for each section below.</p>

              <div className="space-y-6">
                {photoSections.map(section => {
                  const sectionPhotos = existingPhotos.filter(p => p.category === section.id);
                  const isUploading = uploadingState[section.id];

                  return (
                    <div key={section.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50">
                      <div className="mb-4">
                        <h3 className="font-bold text-gray-900">{section.title}</h3>
                        <p className="text-xs text-gray-500">{section.description}</p>
                      </div>

                      {/* Photo Grid */}
                      {sectionPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {sectionPhotos.map(photo => {
                            const url = photoUrls[photo.id];
                            return (
                              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group bg-white">
                                {url ? (
                                  <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                  </div>
                                )}
                                <button
                                  onClick={() => handleDeletePhoto(photo.id)}
                                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-90"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Photos Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setActivePhotoSection(section.id); cameraInputRef.current?.click(); }}
                          disabled={isUploading}
                          className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center hover:bg-gray-50"
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Camera className="w-4 h-4 mr-1.5" /> Take Photo</>}
                        </button>
                        <button
                          onClick={() => { setActivePhotoSection(section.id); fileInputRef.current?.click(); }}
                          disabled={isUploading}
                          className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center hover:bg-gray-50"
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ImageIcon className="w-4 h-4 mr-1.5" /> Gallery</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8">
              <button
                onClick={handleSubmit}
                disabled={submitting || !isChecklistComplete}
                className="w-full bg-[#D6A84F] hover:bg-[#c59841] disabled:bg-gray-200 disabled:text-gray-400 text-[#243B36] font-bold text-lg py-4 rounded-xl transition-colors shadow-sm flex justify-center items-center"
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6 mr-2" /> Submit Installation</>}
              </button>
              {!isChecklistComplete && (
                <p className="text-xs text-center text-gray-500 mt-2">Complete all checklist items to submit.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
