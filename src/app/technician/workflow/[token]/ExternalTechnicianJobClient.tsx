"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Camera, CheckCircle2, Loader2, PlayCircle, PlusCircle, Trash2, Image as ImageIcon, MapPin, Phone, User, Settings, Clock, Truck, ShieldCheck, FileText, Upload } from 'lucide-react';
import { externalStartJob, externalSaveChecklist, externalUploadPhoto, externalDeletePhoto, externalSubmitInstallation, externalGetSignedUrls, externalUploadDocument } from '@/app/actions/externalTechnician';

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(dateString));
  } catch (e) {
    return 'Invalid Date';
  }
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString));
  } catch (e) {
    return 'Invalid Date';
  }
};

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

  const documentInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('trackingToken', token);
    
    const res = await externalUploadDocument(formData);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Document uploaded');
    }
    
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
    setIsUploadingDoc(false);
  };

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

  const c = job.customers?.[0] || {};
  const v = job.vehicles?.[0] || {};
  const ch = job.chargers?.[0] || {};
  const d = job.dealer || {};
  const o = job.oem || {};
  const p = job.partner || {};
  const t = job.technician || {};

  return (
    <div className="min-h-screen bg-gray-100 pb-20 font-sans">
      <input type="file" accept="image/*" className="absolute opacity-0 w-0 h-0 overflow-hidden -z-10" ref={fileInputRef} onChange={handleUploadPhoto} />
      <input type="file" accept="image/*" capture="environment" className="absolute opacity-0 w-0 h-0 overflow-hidden -z-10" ref={cameraInputRef} onChange={handleUploadPhoto} />
        <input type="file" accept="application/pdf" className="absolute opacity-0 w-0 h-0 overflow-hidden -z-10" ref={documentInputRef} onChange={handleUploadDocument} />

      <div className="bg-[#243B36] text-white p-5 sticky top-0 z-10 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wide">ACS ENERGY EV CHARGER</h1>
          <p className="text-sm text-[#D6A84F] font-semibold mt-1 uppercase">INSTALLATION PORTAL</p>
        </div>
      </div>

      <div className="p-4 max-w-3xl mx-auto space-y-6 mt-2">
        
        {/* VENDOR SECTION */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-[#243B36]"/> VENDOR INFORMATION</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">OEM / Vendor Name</p>
              <p className="font-semibold text-gray-900">{o.name || 'ACS Energy'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Partner Name</p>
              <p className="font-semibold text-gray-900">{p.name || 'N/A'}</p>
            </div>
            {p.phone && (
              <div className="col-span-2">
                <a href={`tel:${p.phone}`} className="inline-flex items-center text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
                  <Phone className="w-4 h-4 mr-2" /> Call Vendor / Partner
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ORDER SECTION */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-[#243B36]"/> ORDER DETAILS</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Order Number</p>
              <p className="font-semibold text-gray-900 font-mono text-xs">{job.display_id}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Status</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#243B36] text-white">
                {job.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 mb-1">Created Date</p>
              <p className="font-semibold text-gray-900">{formatDateTime(job.created_at)}</p>
            </div>
          </div>
        </div>

        {/* CUSTOMER SECTION */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center"><User className="w-4 h-4 mr-2 text-[#243B36]"/> CUSTOMER INFORMATION</h3>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Customer Name</p>
              <p className="font-semibold text-gray-900">{c.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Mobile</p>
              <p className="font-semibold text-gray-900">{c.phone || 'N/A'}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-500 mb-1">Full Address</p>
              <p className="font-semibold text-gray-900 leading-relaxed">{c.address || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">State / City</p>
              <p className="font-semibold text-gray-900">{c.state ? `${c.state} / ${c.city}` : c.city || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">PIN Code</p>
              <p className="font-semibold text-gray-900">{c.pincode || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* SERVICE SECTION */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center"><Settings className="w-4 h-4 mr-2 text-[#243B36]"/> SERVICE DETAILS</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2 md:col-span-1">
              <p className="text-gray-500 mb-1">Service Type</p>
              <p className="font-semibold text-gray-900">{job.category?.replace(/_/g, ' ') || 'N/A'}</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-gray-500 mb-1">Scheduled Date</p>
              <p className="font-semibold text-gray-900">{job.scheduled_date ? formatDate(job.scheduled_date) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Vehicle Model</p>
              <p className="font-semibold text-gray-900">{v.model || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Chassis / VIN</p>
              <p className="font-semibold text-gray-900">{v.vin || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Charger Model</p>
              <p className="font-semibold text-gray-900">{ch.model || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Dealer</p>
              <p className="font-semibold text-gray-900">{d.name || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* TECHNICIAN SECTION */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center"><User className="w-4 h-4 mr-2 text-[#243B36]"/> TECHNICIAN INFO</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Service Engineer</p>
              <p className="font-semibold text-gray-900">{t.name || t.full_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Service Contact</p>
              <p className="font-semibold text-gray-900">{t.phone || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="border-t-4 border-[#D6A84F] my-8"></div>

        {job.status === 'UNDER_VERIFICATION' ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-blue-50 text-[#243B36] rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-200">
              <CheckCircle2 className="w-8 h-8 text-[#243B36]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Installation Submitted</h2>
            <p className="text-gray-600 max-w-sm mx-auto text-sm">
              This installation has been submitted and is currently under verification by the partner/admin.
            </p>
          </div>
        ) : !isActive ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-300">
              <PlayCircle className="w-8 h-8 text-[#243B36]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to Start?</h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">Start this job to access the checklist and begin uploading evidence.</p>
            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full bg-[#243B36] hover:bg-[#1a2b27] text-white py-4 rounded-lg font-bold text-lg transition-colors flex justify-center items-center shadow-sm"
            >
              {starting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Start Installation'}
            </button>
          </div>
        ) : (
          <>
            {/* Checklist */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Installation Checklist</h2>
                {savingChecklist && <Loader2 className="animate-spin h-5 w-5 text-gray-400" />}
              </div>
              <div className="space-y-4">
                {checklist.map((item, index) => (
                  <div key={item.item_code} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {index + 1}. {item.item_name}
                          {item.is_required && <span className="text-red-500 ml-1">*</span>}
                        </p>
                      </div>
                      <div className="flex bg-gray-100 rounded border border-gray-300 p-1 shrink-0">
                        {['YES', 'NO', 'N/A'].map(opt => (
                          <button
                            key={opt}
                            onClick={() => handleChecklistToggle(item.item_code, opt)}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                              item.status === opt
                                ? opt === 'YES' || opt === 'N/A' ? 'bg-[#243B36] text-white shadow-sm' : 'bg-red-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
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

            {/* Photos */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900">Evidence Photos</h2>
              <p className="text-sm text-gray-500 mt-1 mb-6">Capture and upload photos for each section below.</p>

              <div className="space-y-6">
                {photoSections.map(section => {
                  const sectionPhotos = existingPhotos.filter(p => p.category === section.id);
                  const isUploading = uploadingState[section.id];

                  return (
                    <div key={section.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="mb-4">
                        <h3 className="font-bold text-gray-900 text-sm uppercase">{section.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{section.description}</p>
                      </div>

                      {sectionPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {sectionPhotos.map(photo => {
                            const url = photoUrls[photo.id];
                            return (
                              <div key={photo.id} className="relative aspect-square rounded overflow-hidden border border-gray-300 bg-white">
                                {url ? (
                                  <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                  </div>
                                )}
                                <button
                                  onClick={() => handleDeletePhoto(photo.id)}
                                  className="absolute top-1 right-1 bg-red-600 text-white p-1.5 rounded shadow opacity-90 hover:opacity-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => { setActivePhotoSection(section.id); cameraInputRef.current?.click(); }}
                          disabled={isUploading}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded shadow-sm text-sm font-bold flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Camera className="w-4 h-4 mr-2" /> CAMERA</>}
                        </button>
                        <button
                          onClick={() => { setActivePhotoSection(section.id); fileInputRef.current?.click(); }}
                          disabled={isUploading}
                          className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded shadow-sm text-sm font-bold flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ImageIcon className="w-4 h-4 mr-2" /> GALLERY</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 mb-8">
              <button
                onClick={handleSubmit}
                disabled={submitting || !isChecklistComplete}
                className="w-full bg-[#D6A84F] hover:bg-[#c59841] disabled:bg-gray-300 disabled:text-gray-500 text-white font-bold text-lg py-4 rounded-lg transition-colors shadow-sm flex justify-center items-center"
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6 mr-2" /> SUBMIT INSTALLATION</>}
              </button>
              {!isChecklistComplete && (
                <p className="text-xs text-center text-gray-500 mt-3 font-semibold uppercase tracking-wider">Complete all checklist items to submit</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
