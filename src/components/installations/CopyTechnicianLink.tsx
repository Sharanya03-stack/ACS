"use client";

import React, { useState } from 'react';
import { Link2, Check, ExternalLink, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function CopyTechnicianLink({ token }: { token?: string }) {
  const [copied, setCopied] = useState(false);

  if (!token) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
        <a 
          href={`/technician/workflow/${token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
        >
          <ExternalLink className="w-4 h-4" /> 3rd-party link
        </a>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded transition-colors"
          title="Copy link"
        >
          {copied ? <Check className="w-3 h-3 text-green-600" /> : <Link2 className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
