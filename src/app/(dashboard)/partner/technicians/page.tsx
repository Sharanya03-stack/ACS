import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { PartnerTechniciansClient } from './PartnerTechniciansClient';
import { redirect } from 'next/navigation';

export default async function PartnerTechniciansPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get Partner org ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'PARTNER' || !profile.org_id) {
    redirect('/login');
  }

  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : '';

  let query = supabase
    .from('profiles')
    .select(`
      id, name, phone, address, role, status, created_at
    `, { count: 'exact' })
    .eq('role', 'TECHNICIAN')
    .eq('org_id', profile.org_id);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data: technicians, count } = await query.order('created_at', { ascending: false });

  return (
    <PartnerTechniciansClient 
      technicians={technicians || []} 
      totalCount={count || 0}
      initialSearch={search}
    />
  );
}
