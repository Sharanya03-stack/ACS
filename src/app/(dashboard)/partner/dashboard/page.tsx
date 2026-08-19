import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import PartnerDashboardClient from './PartnerDashboardClient';

export default async function PartnerDashboard() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, org_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'PARTNER' || !profile.org_id) {
    redirect('/login');
  }

  // Fetch partner installations
  // Using RLS to automatically scope to the partner
  const { data: installations } = await supabase
    .from('installations')
    .select(`
      id, 
      status, 
      technician_id,
      customers(name, city, address),
      technicians:profiles!technician_id(name)
    `)
    .order('created_at', { ascending: false });

  // Fetch eligible technicians for this partner
  const { data: technicians } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('role', 'TECHNICIAN')
    .eq('org_id', profile.org_id);

  return (
    <PartnerDashboardClient 
      installations={installations || []} 
      technicians={technicians || []} 
    />
  );
}
