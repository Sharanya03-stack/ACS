"use client";

import React, { useState } from 'react';
import { Link2, Check, ExternalLink, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function CopyTechnicianLink({ token, technicianId }: { token?: string; technicianId?: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!token) return null;

  const isAssigned = Boolean(technicianId);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isAssigned) {
      toast.error('Assign a technician before generating the technician link.');
      return;
    }

    const url = `${window.location.origin}/technician/workflow/${token}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(true);
        toast.success('Technician link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('Failed to copy link'));
  };

  return (
    <div className="flex flex-col gap-2 mt-4">
      <a 
        href={`/track/${token}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#243B36] hover:underline"
      >
        <MapPin className="w-4 h-4" /> Open tracking
      </a>
      
      <div className="flex items-center gap-3">
        {isAssigned ? (
          <a 
            href={`/technician/workflow/${token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
          >
            <ExternalLink className="w-4 h-4" /> 3rd-party link
          </a>
        ) : (
          <span 
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-400 cursor-not-allowed"
            title="Assign a technician before generating the technician link."
          >
            <ExternalLink className="w-4 h-4" /> 3rd-party link
          </span>
        )}

        <button
          onClick={handleCopy}
          disabled={!isAssigned}
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
            isAssigned 
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-600 cursor-pointer' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
          }`}
          title={isAssigned ? "Copy link" : "Assign a technician before generating the technician link."}
        >
          {copied ? <Check className="w-3 h-3 text-green-600" /> : <Link2 className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
