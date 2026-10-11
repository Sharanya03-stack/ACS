"use client";

import React, { useState } from 'react';
import { PhotoLightbox, LightboxPhoto } from './PhotoLightbox';
import { Eye, Trash2, FileText, Download, ExternalLink, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface EvidenceGalleryProps {
  photos: any[];
  documents?: any[];
  onDeletePhoto?: (photoId: string) => void;
  onDeleteDocument?: (docId: string) => void;
  readOnly?: boolean;
  emptyPhotosMessage?: string;
  emptyDocsMessage?: string;
}

function formatCategory(category?: string): string {
  if (!category) return 'General Photo';
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFileName(item: any): string {
  if (item.file_name) return item.file_name;
  if (item.storage_path) {
    const parts = item.storage_path.split('/');
    return parts[parts.length - 1] || 'evidence';
  }
  return item.category ? `${item.category}.jpg` : 'evidence_photo.jpg';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(dateString?: string): string {
  if (!dateString) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(dateString));
  } catch {
    return '';
  }
}

export function EvidenceGallery({
  photos = [],
  documents = [],
  onDeletePhoto,
  onDeleteDocument,
  readOnly = false,
  emptyPhotosMessage = 'No evidence photos uploaded yet.',
  emptyDocsMessage = 'No installation documents or PDFs uploaded yet.'
}: EvidenceGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Filter out any items that might be PDFs from the photo array just in case
  const photoItems: LightboxPhoto[] = photos.filter(
    (p) => p.file_type !== 'application/pdf' && p.category !== 'INSTALLATION_PDF'
  );

  // Combine documents passed in explicitly or found in photos
  const docItems = [
    ...documents,
    ...photos.filter((p) => p.file_type === 'application/pdf' || p.category === 'INSTALLATION_PDF')
  ].filter((item, index, self) => index === self.findIndex((t) => t.id === item.id));

  const handleThumbnailClick = (index: number) => {
    setActivePhotoIndex(index);
    setLightboxOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleThumbnailClick(index);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Evidence Photos Grid */}
      <div>
        {photoItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {photoItems.map((photo, index) => {
              const fileName = getFileName(photo);
              const category = formatCategory(photo.category);
              const size = formatFileSize(photo.file_size);

              return (
                <div
                  key={photo.id || index}
                  tabIndex={0}
                  role="button"
                  aria-label={`View full image: ${category}`}
                  onClick={() => handleThumbnailClick(index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="group relative flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-[#243B36] cursor-pointer"
                >
                  {/* Thumbnail Image Container */}
                  <div className="relative aspect-square w-full bg-gray-100 overflow-hidden">
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt={category}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-gray-400">
                        <ImageIcon className="w-6 h-6 mb-1 opacity-60" />
                        <span className="text-[11px] text-center">Image loading...</span>
                      </div>
                    )}

                    {/* Hover Overlay with Preview Icon */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="p-2 rounded-full bg-white/90 text-gray-900 shadow-md transform translate-y-1 group-hover:translate-y-0 transition-transform">
                        <Eye className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Delete Button (if permitted) */}
                    {!readOnly && onDeletePhoto && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to remove this evidence photo?')) {
                            onDeletePhoto(photo.id);
                          }
                        }}
                        aria-label="Delete photo"
                        className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-red-600/90 hover:bg-red-700 text-white shadow-sm opacity-90 hover:opacity-100 transition-opacity z-10"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Caption / Label Footer */}
                  <div className="p-2.5 bg-white flex flex-col gap-0.5 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-900 truncate" title={category}>
                      {category}
                    </span>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span className="truncate max-w-[120px]" title={fileName}>
                        {fileName}
                      </span>
                      {size && <span className="shrink-0 text-gray-400">{size}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50/50">
            <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">{emptyPhotosMessage}</p>
            <p className="text-xs text-gray-500 mt-1">Uploaded evidence photos will appear here in the gallery.</p>
          </div>
        )}
      </div>

      {/* 2. Documents & PDFs Section (Cleanly separated from photos) */}
      {docItems.length > 0 && (
        <div className="border-t pt-5">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#243B36]" />
            Installation Documents & PDFs ({docItems.length})
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {docItems.map((doc) => {
              const fileName = getFileName(doc);
              const size = formatFileSize(doc.file_size);
              const date = formatDateTime(doc.uploaded_at);

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate" title={fileName}>
                        {fileName}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span className="font-medium text-red-600">PDF Document</span>
                        {size && <span>• {size}</span>}
                        {date && <span>• {date}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                        title="Open PDF in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">Unavailable</span>
                    )}

                    {!readOnly && onDeleteDocument && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this document?')) {
                            onDeleteDocument(doc.id);
                          }
                        }}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <PhotoLightbox
        isOpen={lightboxOpen}
        photos={photoItems}
        initialIndex={activePhotoIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
