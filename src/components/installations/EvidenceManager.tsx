"use client";

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { uploadEvidence } from '@/app/actions/uploadEvidence';
import { Camera, Image as ImageIcon } from 'lucide-react';

interface EvidenceManagerProps {
  installationId: string;
  category: string;
  existingPhotos: any[];
  onUploadSuccess: () => void;
}

export function EvidenceManager({ installationId, category, existingPhotos, onUploadSuccess }: EvidenceManagerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [showUploadMenu, setShowUploadMenu] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});

  const isEarthingRequired = category === 'Installation + Earthing';

  const handlePhotoClick = (cat: string) => {
    setActiveCategory(cat);
    setShowUploadMenu(cat);
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
    const files = e.target.files;
    if (!activeCategory || !files || files.length === 0) return;
    
    setUploadingState(prev => ({ ...prev, [activeCategory]: true }));
    
    let hasError = false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('installationId', installationId);
      formData.append('category', activeCategory);
      
      const res = await uploadEvidence(formData);
      if (res.error) {
        toast.error(res.error);
        hasError = true;
      }
    }
    
    if (!hasError) {
      toast.success(files.length > 1 ? 'Photos uploaded' : 'Photo uploaded');
      onUploadSuccess();
    }
    
    e.target.value = ''; // Reset input
    setUploadingState(prev => ({ ...prev, [activeCategory]: false }));
    setActiveCategory(null);
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Evidence Photos</h3>
      
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

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => handlePhotoClick('Extra_Installation_Photo')}
          disabled={uploadingState['Extra_Installation_Photo']}
          className="flex-1 bg-white border border-gray-300 rounded-md py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center disabled:opacity-50"
        >
          {uploadingState['Extra_Installation_Photo'] ? 'Uploading...' : 'Upload Installation Photo'}
        </button>
        {isEarthingRequired && (
          <button
            onClick={() => handlePhotoClick('Extra_Earthing_Photo')}
            disabled={uploadingState['Extra_Earthing_Photo']}
            className="flex-1 bg-white border border-gray-300 rounded-md py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center disabled:opacity-50"
          >
            {uploadingState['Extra_Earthing_Photo'] ? 'Uploading...' : 'Upload Earthing Photo'}
          </button>
        )}
      </div>

      {existingPhotos.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {existingPhotos.map((photo) => (
            <div key={photo.id} className="border rounded-md overflow-hidden bg-gray-50 flex flex-col">
              <div className="p-2 text-xs font-semibold bg-gray-100 border-b text-center capitalize">
                {photo.category.replace(/_/g, ' ')}
              </div>
              <div className="relative aspect-video">
                {photo.url ? (
                  <Image src={photo.url} alt={photo.category} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-gray-500">Image unavailable</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center">No photos uploaded yet.</p>
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
