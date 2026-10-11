"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

export interface LightboxPhoto {
  id: string;
  url: string;
  category?: string;
  storage_path?: string;
  file_name?: string;
  file_size?: number;
  uploaded_at?: string;
}

interface PhotoLightboxProps {
  isOpen: boolean;
  photos: LightboxPhoto[];
  initialIndex?: number;
  onClose: () => void;
}

function formatCategory(category?: string): string {
  if (!category) return 'General Evidence';
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFileName(photo: LightboxPhoto): string {
  if (photo.file_name) return photo.file_name;
  if (photo.storage_path) {
    const parts = photo.storage_path.split('/');
    return parts[parts.length - 1] || 'photo.jpg';
  }
  return 'Evidence Photo';
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(dateString));
  } catch {
    return '';
  }
}

export function PhotoLightbox({ isOpen, photos, initialIndex = 0, onClose }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, photos.length - 1)));
      setIsZoomed(false);
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen, initialIndex, photos.length]);

  // Lock background scroll when open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle navigation
  const handlePrev = useCallback(() => {
    if (photos.length <= 1) return;
    setIsZoomed(false);
    setIsLoading(true);
    setHasError(false);
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [photos.length]);

  const handleNext = useCallback(() => {
    if (photos.length <= 1) return;
    setIsZoomed(false);
    setIsLoading(true);
    setHasError(false);
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [photos.length]);

  // Keyboard navigation & escape listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  if (!currentPhoto) return null;

  const fileName = getFileName(currentPhoto);
  const categoryLabel = formatCategory(currentPhoto.category);
  const dateFormatted = formatDateTime(currentPhoto.uploaded_at);
  const sizeFormatted = formatFileSize(currentPhoto.file_size);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview lightbox"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/92 backdrop-blur-sm select-none"
    >
      {/* Top Bar: Title, Count, and Controls */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 bg-gradient-to-b from-black/80 to-transparent z-20 text-white shrink-0">
        <div className="flex flex-col min-w-0 pr-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#243B36] text-[#E8FAF4] border border-[#3b5e57]">
              {categoryLabel}
            </span>
            <span className="text-xs text-gray-300">
              {currentIndex + 1} of {photos.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-300 truncate mt-1 max-w-xs sm:max-w-md font-mono" title={fileName}>
            {fileName}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom Toggle */}
          <button
            type="button"
            onClick={() => setIsZoomed((prev) => !prev)}
            aria-label={isZoomed ? "Zoom out" : "Zoom in"}
            className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
            title={isZoomed ? "Zoom Out (Click to toggle)" : "Zoom In (Click to toggle)"}
          >
            {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </button>

          {/* Open in New Tab / Download */}
          {currentPhoto.url && (
            <a
              href={currentPhoto.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open original image in new tab"
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
              title="Open full resolution in new tab"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close image preview"
            className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-red-600/70 transition-colors ml-1 focus:outline-none focus:ring-2 focus:ring-white/40"
            title="Close (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Center Stage */}
      <div
        ref={backdropRef}
        onClick={(e) => {
          if (e.target === backdropRef.current) {
            onClose();
          }
        }}
        className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden min-h-0"
      >
        {/* Loading Spinner */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none">
            <Loader2 className="w-10 h-10 animate-spin text-[#D6A84F]" />
            <span className="text-xs text-gray-400 mt-2">Loading image...</span>
          </div>
        )}

        {/* Error Fallback */}
        {hasError ? (
          <div className="bg-gray-900/90 border border-red-500/30 rounded-xl p-8 max-w-md text-center text-white shadow-2xl">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h4 className="font-semibold text-base mb-1">Image Preview Unavailable</h4>
            <p className="text-xs text-gray-400 mb-4">
              The preview for this photo could not be loaded or the secure session link has expired.
            </p>
            {currentPhoto.url && (
              <a
                href={currentPhoto.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#243B36] hover:bg-[#1a2b27] text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Try Opening Directly
              </a>
            )}
          </div>
        ) : (
          <div
            className={`relative flex items-center justify-center transition-transform duration-200 ease-out max-h-full max-w-full ${
              isZoomed ? 'scale-150 sm:scale-175 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
            }`}
            onClick={() => setIsZoomed((prev) => !prev)}
            title={isZoomed ? "Click to Zoom Out" : "Click to Zoom In"}
          >
            <img
              key={currentPhoto.id + currentPhoto.url}
              src={currentPhoto.url}
              alt={categoryLabel}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              className="max-h-[75vh] sm:max-h-[82vh] max-w-[92vw] object-contain rounded-md shadow-2xl transition-opacity duration-200"
              style={{ opacity: isLoading ? 0 : 1 }}
            />
          </div>
        )}

        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Previous photo"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-white/40 shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-white/40 z-20"
            title="Previous (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        )}

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Next photo"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-white/40 shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-white/40 z-20"
            title="Next (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        )}
      </div>

      {/* Bottom Bar: Thumbnail Strip & Metadata */}
      <div className="bg-gradient-to-t from-black/90 via-black/80 to-transparent px-4 py-3 sm:px-6 z-20 text-white shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-5xl mx-auto">
          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {dateFormatted && <span>Uploaded: {dateFormatted}</span>}
            {sizeFormatted && <span>Size: {sizeFormatted}</span>}
          </div>

          {/* Quick thumbnail strip for multiple photos */}
          {photos.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full sm:max-w-md no-scrollbar">
              {photos.map((p, idx) => {
                const isSelected = idx === currentIndex;
                return (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => {
                      if (idx !== currentIndex) {
                        setIsZoomed(false);
                        setIsLoading(true);
                        setHasError(false);
                        setCurrentIndex(idx);
                      }
                    }}
                    className={`relative w-11 h-11 rounded overflow-hidden shrink-0 transition-all border-2 ${
                      isSelected ? 'border-[#D6A84F] scale-105 shadow-md ring-2 ring-[#D6A84F]/40' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                    title={`${formatCategory(p.category)} (${idx + 1}/${photos.length})`}
                  >
                    <img src={p.url} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="text-xs text-gray-400 hidden sm:block">
            Keyboard: <kbd className="px-1 py-0.5 bg-white/10 rounded">←</kbd> <kbd className="px-1 py-0.5 bg-white/10 rounded">→</kbd> to navigate, <kbd className="px-1 py-0.5 bg-white/10 rounded">Esc</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
}
