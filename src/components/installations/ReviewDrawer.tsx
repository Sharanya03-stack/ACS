"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { reviewInstallation } from '@/app/actions/reviewInstallation';
import toast from 'react-hot-toast';
import { formatPowerRating } from '@/utils/formatters';
import Image from 'next/image';
import { InstallationNotes } from './InstallationNotes';

interface ReviewDrawerProps {
  installationId: string | null;
  onClose: () => void;
  onReviewComplete: () => void;
}

export function ReviewDrawer({ installationId, onClose, onReviewComplete }: ReviewDrawerProps) {
  const [details, setDetails] = useState<any>(null);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (installationId) {
      loadDetails();
    }
  }, [installationId]);

  const loadDetails = async () => {
    setLoading(true);
    // Fetch installation and relational data
    const { data: instData } = await supabase
      .from('installations')
      .select(`
        *,
        customers (*),
        vehicles (*),
        chargers (*),
        dealer:organizations!dealer_id (name, metadata),
        partner:organizations!partner_id (name),
        technician:profiles!technician_id (name, email)
      `)
      .eq('id', installationId)
      .single();

    if (instData) {
      setDetails(instData);

      // Fetch audit logs for timeline
      const { data: eventData } = await supabase
        .from('audit_logs')
        .select(`
          *,
          actor:profiles!user_id (name, role)
        `)
        .eq('entity_type', 'INSTALLATION')
        .eq('entity_id', installationId)
        .order('created_at', { ascending: true });
        
      if (eventData) {
        setEvents(eventData);
      }

      // Fetch checklists
      const { data: checklistData } = await supabase
        .from('installation_checklists')
        .select('*')
        .eq('installation_id', installationId);
      if (checklistData) setChecklists(checklistData);

      // Fetch photos metadata
      const { data: photoData } = await supabase
        .from('installation_photos')
        .select('*')
        .eq('installation_id', installationId);
      
      if (photoData) {
        // Create signed URLs
        const photosWithUrls = await Promise.all(photoData.map(async (photo) => {
          const { data } = await supabase.storage
            .from('installation-evidence')
            .createSignedUrl(photo.storage_path, 3600); // 1 hour
          return { ...photo, url: data?.signedUrl };
        }));
        setPhotos(photosWithUrls);
      }
    }
    setLoading(false);
  };

  const getEventTitle = (event: any) => {
    switch (event.action) {
      case 'CREATED': return 'Installation Request Created';
      case 'PARTNER_ASSIGNED': return 'Partner Assigned';
      case 'TECHNICIAN_ASSIGNED': return 'Technician Assigned';
      case 'STATUS_CHANGED': 
        const status = event.new_value?.status;
        if (status === 'IN_PROGRESS') return 'Installation Started';
        if (status === 'UNDER_VERIFICATION') return 'Submitted for Verification';
        if (status === 'REVISIT_REQUIRED') return 'Revisit Requested';
        if (status === 'VERIFIED') return 'Installation Verified';
        if (status === 'COMPLETED') return 'Installation Completed';
        return `Status Changed to ${status}`;
      default: return event.action;
    }
  };

  const getEventDetails = (event: any) => {
    switch (event.action) {
      case 'STATUS_CHANGED':
        if (event.new_value?.status === 'REVISIT_REQUIRED') {
          return `Reason: ${event.new_value?.rejection_reason || 'No reason provided'}`;
        }
        return null;
      default: return null;
    }
  };

  const handleVerify = async () => {
    if (!installationId) return;
    if (window.confirm('Are you sure you want to verify this installation?')) {
      setIsSubmitting(true);
      const res = await reviewInstallation(installationId, 'VERIFIED');
      if (res.success) {
        onReviewComplete();
      } else {
        alert(res.error || "Failed to verify.");
      }
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!installationId) return;
    if (!rejectReason.trim()) {
      alert("Please provide a reason for requesting a revisit.");
      return;
    }
    if (window.confirm('Are you sure you want to request a revisit?')) {
      setIsSubmitting(true);
      const res = await reviewInstallation(installationId, 'REVISIT_REQUIRED', rejectReason);
      if (res.success) {
        onReviewComplete();
      } else {
        alert(res.error || "Failed to request revisit.");
      }
      setIsSubmitting(false);
    }
  };

  if (!installationId) return null;

  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
      <section className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-2xl flex flex-col bg-white shadow-xl overflow-y-auto">
          <div className="px-4 py-6 bg-gray-50 border-b sm:px-6 flex justify-between items-center sticky top-0 z-10">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Installation Review</h2>
              <p className="text-sm text-gray-500">{installationId}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Close panel</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 px-4 py-6 sm:px-6 space-y-8">
            {loading ? (
              <div className="text-center py-12">Loading details...</div>
            ) : details ? (
              <>
                {/* Status Banner */}
                <div className={`p-4 rounded-md font-bold text-center ${details.status === 'UNDER_VERIFICATION' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-gray-100 text-gray-800'}`}>
                  Current Status: {details.status}
                </div>

                {/* Verification Actions */}
                {details.status === 'UNDER_VERIFICATION' && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h3 className="font-bold text-yellow-800 mb-2">Verification Required</h3>
                    <p className="text-sm text-yellow-700 mb-4">Please review the checklist and photos uploaded by the technician. If everything is correct, verify the installation.</p>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleVerify}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded whitespace-nowrap disabled:opacity-50"
                      >
                        Approve & Verify
                      </button>
                      <div className="flex-1 flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Reason for revisit" 
                          className="flex-1 rounded-md border-gray-300 border px-3 text-sm"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <button 
                          onClick={handleReject}
                          disabled={isSubmitting || !rejectReason.trim()}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                        >
                          Request Revisit
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <h3 className="font-medium text-gray-500">Customer</h3>
                    <p className="font-semibold">{details.customers?.name}</p>
                    <p>{details.customers?.phone}</p>
                    <p>{details.customers?.address}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-500">Vehicle</h3>
                    <p>{details.vehicles?.model}</p>
                    <p>VIN: {details.vehicles?.vin}</p>
                    <p>Sale Date: {details.vehicles?.sale_date}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-500">Charger</h3>
                    <p>{details.chargers?.model} ({formatPowerRating(details.chargers?.power_rating)})</p>
                    <p>SN: {details.chargers?.serial_number}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-500">Installation</h3>
                    <p>Category: {details.category}</p>
                    <p>Partner: {details.partner?.name || 'Unassigned'}</p>
                    <p>Technician: {details.technician?.name || 'Unassigned'}</p>
                  </div>
                </div>

                {/* Timeline Events */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Event Timeline</h3>
                  {events.length > 0 ? (
                    <div className="flow-root">
                      <ul role="list" className="-mb-8">
                        {events.map((event, eventIdx) => (
                          <li key={event.id}>
                            <div className="relative pb-8">
                              {eventIdx !== events.length - 1 ? (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                              ) : null}
                              <div className="relative flex space-x-3">
                                <div>
                                  <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
                                    <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                  <div>
                                    <p className="text-sm text-gray-900 font-medium">{getEventTitle(event)}</p>
                                    <p className="text-sm text-gray-500">By: {event.actor?.name || 'System'} ({event.actor?.role || 'System'})</p>
                                    {getEventDetails(event) && (
                                      <p className="mt-1 text-sm text-red-600">{getEventDetails(event)}</p>
                                    )}
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
                    <p className="text-sm text-gray-500">No events recorded.</p>
                  )}
                </div>

                {/* Checklist */}
                {checklists.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Checklist Results</h3>
                    <ul className="space-y-3">
                      {checklists.map((item) => (
                        <li key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                          <span className="text-sm font-medium">
                            {item.item_name} {item.is_required && <span className="text-red-500">*</span>}
                          </span>
                          <span className={`px-2 py-1 text-xs font-bold rounded ${
                            item.status === 'YES' ? 'bg-green-100 text-green-800' :
                            item.status === 'NO' ? 'bg-red-100 text-red-800' :
                            'bg-gray-200 text-gray-800'
                          }`}>
                            {item.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Photos */}
                {photos.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Evidence Photos</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {photos.map((photo) => (
                        <div key={photo.id} className="border rounded-md overflow-hidden bg-gray-50 flex flex-col">
                          <div className="p-2 text-xs font-semibold bg-gray-100 border-b text-center capitalize">
                            {photo.category.replace(/_/g, ' ')}
                          </div>
                          <div className="relative aspect-video">
                            {photo.url ? (
                              <Image src={photo.url} alt={photo.category} fill className="object-contain" unoptimized />
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-gray-500">Image unavilable</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Installation Notes */}
                <InstallationNotes installationId={details.id} />
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">Could not load installation details.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
