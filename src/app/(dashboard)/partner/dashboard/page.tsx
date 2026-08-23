import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import PartnerDashboardClient from './PartnerDashboardClient';
import { getInstallations } from '@/utils/queries';

export default async function PartnerDashboard({
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

  if (!profile || profile.role !== 'PARTNER' || !profile.org_id) {
    redirect('/login');
  }

  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const technician_id = typeof params.technician_id === 'string' ? params.technician_id : undefined;

  const [
    { data: installations, count },
    { data: technicians }
  ] = await Promise.all([
    getInstallations(supabase, { page, search, status, category, technician_id }),
    supabase
      .from('profiles')
      .select('id, name, role')
      .eq('role', 'TECHNICIAN')
      .eq('org_id', profile.org_id)
  ]);

  return (
    <PartnerDashboardClient 
      installations={installations || []} 
      totalCount={count || 0}
      technicians={technicians || []} 
    />
  );
}
