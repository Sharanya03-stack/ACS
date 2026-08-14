"use client";

import React from 'react';
import { useData } from '@/lib/data-context';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const { installations, customers } = useData();

  const myJobs = installations.filter(i => i.technicianId === user?.roleId);

  return (
    <div className="max-w-md mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Jobs</h1>
        <p className="text-sm text-gray-500">Today's assigned installations.</p>
      </div>

      <div className="space-y-4">
        {myJobs.length === 0 ? (
          <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No jobs assigned to you yet.</p>
          </div>
        ) : (
          myJobs.map(job => {
            const customer = customers.find(c => c.id === job.customerId);
            const isCompleted = ['UNDER VERIFICATION', 'VERIFIED', 'COMPLETED'].includes(job.status);
            
            return (
              <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-gray-500">{job.id}</span>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                      isCompleted ? 'bg-green-100 text-green-800' 
                      : job.status === 'REVISIT REQUIRED' ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{customer?.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{customer?.address}, {customer?.city}</p>
                  <p className="text-xs text-gray-500 mb-4">Scheduled: {job.scheduledDate || 'Not set'}</p>
                  
                  <Link 
                    href={`/technician/jobs/${job.id}`}
                    className={`block w-full text-center rounded-md py-2 text-sm font-medium ${
                      isCompleted ? 'bg-gray-100 text-gray-700 border border-gray-300' 
                      : job.status === 'REVISIT REQUIRED' ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-acs-primary text-white hover:bg-acs-primary/90'
                    }`}
                  >
                    {isCompleted ? 'View Details' : job.status === 'REVISIT REQUIRED' ? 'Fix Rejection' : 'Start / Continue Job'}
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
