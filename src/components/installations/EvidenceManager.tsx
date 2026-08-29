"use client";

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { uploadEvidence } from '@/app/actions/uploadEvidence';

interface EvidenceManagerProps {
  installationId: string;
  category: string;
  existingPhotos: any[];
  onUploadSuccess: () => void;
}

export function EvidenceManager({ installationId, category, existingPhotos, onUploadSuccess }: EvidenceManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});

  const isEarthingRequired = category === 'Installation + Earthing';

  const handlePhotoClick = (cat: string) => {
    setActiveCategory(cat);
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
    formData.append('installationId', installationId);
    formData.append('category', activeCategory);
    
    const res = await uploadEvidence(formData);
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(res.message || 'Photo uploaded');
      onUploadSuccess();
    }
    
    setUploadingState(prev => ({ ...prev, [activeCategory]: false }));
    setActiveCategory(null);
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Evidence Photos</h3>
      
      <input 
        type="file" 
        accept="image/jpeg,image/png,image/webp"
        className="hidden" 
        ref={fileInputRef}
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
    </div>
  );
}
