import React from 'react';
import { InstallationStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: InstallationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
  
  switch (status) {
    case 'NEW':
      colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
      break;
    case 'PARTNER ASSIGNED':
    case 'TECHNICIAN ASSIGNED':
    case 'SCHEDULED':
      colorClass = 'bg-purple-50 text-purple-700 border-purple-200';
      break;
    case 'IN PROGRESS':
    case 'UNDER VERIFICATION':
      colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
      break;
    case 'COMPLETED':
    case 'VERIFIED':
      colorClass = 'bg-green-50 text-green-700 border-green-200';
      break;
    case 'ON HOLD':
    case 'RESCHEDULED':
    case 'REVISIT REQUIRED':
      colorClass = 'bg-orange-50 text-orange-700 border-orange-200';
      break;
    case 'CANCELLED':
    case 'FAILED':
      colorClass = 'bg-red-50 text-red-700 border-red-200';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {status}
    </span>
  );
}
