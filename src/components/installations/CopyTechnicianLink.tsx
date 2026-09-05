"use client";

import React, { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function CopyTechnicianLink({ token }: { token?: string }) {
  const [copied, setCopied] = useState(false);

  if (!token) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-md transition-colors"
      title="Copy link for external technician"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Link2 className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy Technician Link'}
    </button>
  );
}
