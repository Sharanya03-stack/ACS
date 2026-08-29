import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CustomerNameCell } from '@/components/customers/CustomerDetailsDrawer';
import { getInstallations } from '@/utils/queries';
import { InstallationFilters } from '@/components/ui/InstallationFilters';
import { Pagination } from '@/components/ui/Pagination';

export default async function TechnicianDashboard({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'TECHNICIAN') {
    redirect('/login');
  }

  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;

  // Fetch technician jobs
  // RLS will automatically restrict this to technician_id = auth.uid()
  const { data: jobs, count } = await getInstallations(supabase, {
    page, search, status, category
  });

  return (
    <div className="max-w-md mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">My Jobs</h1>
        <p className="text-sm text-gray-500">Today's assigned installations.</p>
      </div>

      <InstallationFilters />

      <div className="space-y-4">
        {!jobs || jobs.length === 0 ? (
          <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No jobs assigned to you yet.</p>
          </div>
        ) : (
          jobs.map(job => {
            const customer = job.customers;
            const isCompleted = ['UNDER_VERIFICATION', 'VERIFIED', 'COMPLETED'].includes(job.status);
            
            return (
              <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-gray-500">{job.id}</span>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                      isCompleted ? 'bg-green-100 text-green-800' 
                      : job.status === 'REVISIT_REQUIRED' ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="mb-1 text-lg">
                    {customer ? (
                      <CustomerNameCell id={customer.id} name={`${customer.name || ''}`} />
                    ) : (
                      <span className="text-gray-400 font-bold">Unknown Customer</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{customer?.address}, {customer?.city}</p>
                  <p className="text-xs font-mono text-gray-500 mb-2">Charger SN: {job.chargers?.serial_number || 'N/A'}</p>
                  <p className="text-xs text-gray-500 mb-4">Scheduled: {job.scheduled_date || 'Not set'}</p>
                  
                  <Link 
                    href={`/technician/jobs/${job.id}`}
                    className={`block w-full text-center rounded-md py-2 text-sm font-medium ${
                      isCompleted ? 'bg-gray-100 text-gray-700 border border-gray-300' 
                      : job.status === 'REVISIT_REQUIRED' ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-acs-primary text-white hover:bg-acs-primary/90'
                    }`}
                  >
                    {isCompleted ? 'View Details' : job.status === 'REVISIT_REQUIRED' ? 'Fix Rejection' : 'Start / Continue Job'}
                  </Link>
                </div>
              </div>
            );
          })
        )}
        <Pagination totalItems={count || 0} />
      </div>
    </div>
  );
}
