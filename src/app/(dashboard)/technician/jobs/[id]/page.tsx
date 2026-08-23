import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect, notFound } from 'next/navigation';
import TechnicianJobClient from './TechnicianJobClient';

export default async function TechnicianJobPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'TECHNICIAN') {
    redirect('/login');
  }

  // Fetch installation. 
  // RLS will enforce that technician_id === auth.uid() automatically.
  const { data: job, error } = await supabase
    .from('installations')
    .select(`
      id, status, scheduled_date, rejection_reason,
      customers(name, city, address, phone, pincode),
      vehicles(model, vin)
    `)
    .eq('id', id)
    .single();

  if (error || !job) {
    // If job not found, it means it doesn't exist or RLS blocked it (not owned by this tech)
    notFound();
  }

  // Fetch checklists
  const { data: checklists } = await supabase
    .from('installation_checklists')
    .select('*')
    .eq('installation_id', id);

  // Fetch photos
  const { data: photos } = await supabase
    .from('installation_photos')
    .select('*')
    .eq('installation_id', id);

  return (
    <TechnicianJobClient 
      job={job}
      existingChecklists={checklists || []}
      existingPhotos={photos || []}
    />
  );
}
