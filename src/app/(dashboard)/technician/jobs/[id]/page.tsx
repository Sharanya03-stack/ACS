"use client";

import React, { useState, useEffect } from 'react';
import { useData } from '@/lib/data-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react'; // React 19 / Next 15 `use` for params
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Image from 'next/image';

export default function TechnicianJobPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const { installations, customers, vehicles, updateInstallationStatus, updateChecklistAndPhotos } = useData();
  
  const [job, setJob] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [vehicle, setVehicle] = useState<any>(null);

  // Form State
  const [otp, setOtp] = useState('');
  const [photos, setPhotos] = useState<{ category: string, file: File | null, preview: string | null, isUploading?: boolean }[]>([
    { category: 'Before Installation', file: null, preview: null },
    { category: 'Electrical Panel', file: null, preview: null },
    { category: 'MCB', file: null, preview: null },
    { category: 'Earthing', file: null, preview: null },
    { category: 'Charger Mounting', file: null, preview: null },
    { category: 'Charger Serial Number', file: null, preview: null },
    { category: 'Wiring', file: null, preview: null },
    { category: 'Final Installed Charger', file: null, preview: null },
    { category: 'Charger Powered On', file: null, preview: null },
    { category: 'Charging Test', file: null, preview: null }
  ]);
  
  const [checklist, setChecklist] = useState<{ id: string, label: string, status: string }[]>([
    { id: 'c1', label: 'Charger received', status: 'PENDING' },
    { id: 'c2', label: 'Charger serial number verified', status: 'PENDING' },
    { id: 'c3', label: 'Mounting completed', status: 'PENDING' },
    { id: 'c4', label: 'Wiring completed', status: 'PENDING' },
    { id: 'c5', label: 'MCB installed', status: 'PENDING' },
    { id: 'c6', label: 'Earthing checked', status: 'PENDING' },
    { id: 'c7', label: 'Voltage checked', status: 'PENDING' },
    { id: 'c8', label: 'Charger powered on', status: 'PENDING' },
    { id: 'c9', label: 'Charging test completed', status: 'PENDING' },
    { id: 'c10', label: 'Installation completed', status: 'PENDING' },
  ]);

  useEffect(() => {
    const foundJob = installations.find(i => i.id === id);
    if (foundJob) {
      setJob(foundJob);
      setCustomer(customers.find(c => c.id === foundJob.customerId));
      setVehicle(vehicles.find(v => v.id === foundJob.vehicleId));
      if (foundJob.checklist) setChecklist(foundJob.checklist);
    }
  }, [id, installations, customers, vehicles]);

  if (!job) return <div className="p-8 text-center">Loading...</div>;

  const isCompleted = ['UNDER VERIFICATION', 'VERIFIED', 'COMPLETED'].includes(job.status);

  const startJob = () => {
    updateInstallationStatus(job.id, 'IN PROGRESS');
  };

  const handlePhotoUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newPhotos = [...photos];
      newPhotos[index] = { ...newPhotos[index], isUploading: true };
      setPhotos(newPhotos);
      
      setTimeout(() => {
        const preview = URL.createObjectURL(file);
        setPhotos(current => {
          const updated = [...current];
          updated[index] = { ...updated[index], file, preview, isUploading: false };
          return updated;
        });
      }, 800); // simulate fast upload
    }
  };

  const handleChecklistChange = (index: number, status: string) => {
    const newChecklist = [...checklist];
    newChecklist[index].status = status;
    setChecklist(newChecklist);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '4821') {
      toast.error("Invalid OTP! For demo purposes, use '4821'.");
      return;
    }
    
    // Check if all photos uploaded
    if (photos.some(p => !p.preview)) {
      toast.error("Please upload all required photographs.");
      return;
    }

    // Check if all checklist items are YES or N/A
    if (checklist.some(c => c.status === 'PENDING' || c.status === 'NO')) {
      toast.error("Please complete the installation checklist successfully before submitting.");
      return;
    }

    // Submit
    const photosToSave = photos.map(p => ({
      id: `p-${Math.random()}`,
      category: p.category,
      url: p.preview!,
      timestamp: new Date().toISOString()
    }));

    updateChecklistAndPhotos(job.id, checklist, photosToSave);
    toast.success("Installation submitted for verification!", {
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
    router.push('/technician/dashboard');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
  };

  return (
    <div className="max-w-md mx-auto py-6 px-4 pb-24">
      <Link href="/technician/dashboard" className="text-[#243B36] hover:text-[#D6A84F] transition-colors text-sm font-medium mb-4 inline-block">&larr; Back to Jobs</Link>
      
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6 relative">
        <div className="h-32 relative">
          <Image 
            src="/images/tech-bg.jpg"
            alt="Installation Details"
            fill
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/80"></div>
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
            <span className="font-semibold text-gray-700">Vehicle:</span> {vehicle?.model} ({vehicle?.registrationNumber})
          </div>
        </div>
      </motion.div>

      {!isCompleted && job.status !== 'IN PROGRESS' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
          {job.status === 'REVISIT REQUIRED' && job.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="text-red-800 font-bold mb-1">Installation Rejected</h3>
              <p className="text-red-700 text-sm">{job.rejectionReason}</p>
            </div>
          )}
          <button 
            onClick={startJob}
            className={`w-full text-white font-bold py-4 rounded-lg shadow-sm transition-colors ${
              job.status === 'REVISIT REQUIRED' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#243B36] hover:bg-[#1a2b27]'
            }`}
          >
            {job.status === 'REVISIT REQUIRED' ? 'FIX REJECTION' : 'START INSTALLATION'}
          </button>
        </motion.div>
      )}

      {(job.status === 'IN PROGRESS' || isCompleted) && (
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
                <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <p className="text-sm text-gray-700 flex-1">{item.label}</p>
                  <div className="flex rounded-md shadow-sm">
                    {['YES', 'NO', 'N/A'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        disabled={isCompleted}
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
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-sm font-medium">
              <span className="text-gray-600">Progress</span>
              {checklist.filter(c => c.status === 'YES' || c.status === 'N/A').length === checklist.length ? (
                <span className="text-green-600">✓ Checklist Complete</span>
              ) : (
                <span className="text-gray-900">{checklist.filter(c => c.status === 'YES' || c.status === 'N/A').length} / {checklist.length} completed</span>
              )}
            </div>
          </motion.div>

          {/* Photos */}
          <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Installation Photos</h2>
            <div className="grid grid-cols-2 gap-4">
              {photos.map((photo, index) => (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} key={index} className={`border border-dashed rounded-lg p-2 flex flex-col items-center justify-center text-center relative overflow-hidden aspect-square cursor-pointer transition-colors ${photo.preview ? 'border-green-300 bg-green-50/30' : 'border-gray-300 bg-gray-50'}`}>
                  {photo.isUploading ? (
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-5 h-5 border-2 border-[#D6A84F] border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-[10px] text-gray-500 font-medium">Uploading...</span>
                    </div>
                  ) : photo.preview || (job.photos && job.photos.find((p:any) => p.category === photo.category)?.url) ? (
                    <>
                      <img 
                        src={photo.preview || job.photos.find((p:any) => p.category === photo.category)?.url} 
                        alt={photo.category} 
                        className="absolute inset-0 w-full h-full object-cover" 
                      />
                      <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      {!isCompleted && (
                        <div className="absolute bottom-1 right-1 bg-red-500/90 text-white text-[9px] px-1.5 py-0.5 rounded cursor-pointer shadow-sm z-10" onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const newPhotos = [...photos];
                          newPhotos[index] = { ...newPhotos[index], file: null, preview: null };
                          setPhotos(newPhotos);
                        }}>Remove</div>
                      )}
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[10px] text-gray-600 font-medium leading-tight">{photo.category}</span>
                      <span className="text-[9px] text-red-500 mt-1">Required</span>
                    </>
                  )}
                  {!isCompleted && !photo.isUploading && (
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      onChange={(e) => handlePhotoUpload(index, e)}
                    />
                  )}
                </motion.div>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-100 text-sm font-medium flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Uploads</span>
                <span className="text-gray-900">{photos.filter(p => p.preview).length} / {photos.length} photos uploaded</span>
              </div>
              {photos.filter(p => !p.preview).length > 0 && (
                <div className="text-red-500 text-xs text-right">
                  {photos.filter(p => !p.preview).length} required photos are still missing.
                </div>
              )}
            </div>
          </motion.div>

          {/* OTP */}
          {!isCompleted && (
            <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Customer Confirmation</h2>
              <p className="text-xs text-gray-500 mb-4">Please ask the customer for the 4-digit OTP sent to their mobile number ({customer?.phone}). Demo OTP: 4821</p>
              <input 
                type="text" 
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 4-digit OTP" 
                className="w-full text-center text-2xl tracking-widest font-mono p-3 border border-gray-300 rounded-md focus:ring-[#243B36] focus:border-[#243B36] transition-shadow"
                required
              />
            </motion.div>
          )}

          {!isCompleted && (
            <motion.div variants={itemVariants}>
              <button 
                type="submit"
                disabled={
                  photos.some(p => !p.preview) || 
                  checklist.some(c => c.status === 'PENDING' || c.status === 'NO') ||
                  otp.length !== 4 ||
                  photos.some(p => p.isUploading)
                }
                className="w-full bg-[#243B36] text-white font-bold py-4 rounded-lg shadow-sm hover:bg-[#1a2b27] transition-colors mt-4 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
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
