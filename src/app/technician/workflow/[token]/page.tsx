import React from 'react';
import { notFound } from 'next/navigation';
import { getInstallationByToken } from '@/app/actions/externalTechnician';
import { createClient } from '@supabase/supabase-js';
import ExternalTechnicianJobClient from './ExternalTechnicianJobClient';

export default async function ExternalTechnicianJobPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const { token } = params;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    notFound();
  }

  const job = await getInstallationByToken(token);
  if (!job) {
    notFound();
  }

  if (job.status === 'VERIFIED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Installation Complete</h1>
          <p className="text-gray-600">This installation has been successfully verified.</p>
        </div>
      </div>
    );
  }

  if (!job.technician_id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Technician Not Assigned</h1>
          <p className="text-gray-600">This installation has not been assigned to a technician yet. Please contact ACS or your installation partner.</p>
        </div>
      </div>
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: checklists } = await supabase
    .from('installation_checklists')
    .select('*')
    .eq('installation_id', job.id);

  const { data: photos } = await supabase
    .from('installation_photos')
    .select('*')
    .eq('installation_id', job.id);

  return (
    <ExternalTechnicianJobClient 
      token={token}
      job={job}
      existingChecklists={checklists || []}
      existingPhotos={photos || []}
    />
  );
}
