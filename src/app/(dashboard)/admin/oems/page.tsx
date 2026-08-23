import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { AdminOemsClient } from './AdminOemsClient';
import { redirect } from 'next/navigation';

export default async function AdminOemsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : '';

  let query = supabase
    .from('organizations')
    .select(`
      id, name, type, contact_email, contact_phone, status, created_at,
      dealerships:organizations!parent_org_id (id)
    `, { count: 'exact' })
    .eq('type', 'OEM');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data: oems, count } = await query.order('created_at', { ascending: false });

  // Map to format suitable for UI
  const formattedOems = (oems || []).map(oem => ({
    ...oem,
    dealership_count: oem.dealerships?.length || 0
  }));

  return (
    <AdminOemsClient 
      oems={formattedOems} 
      totalCount={count || 0}
      initialSearch={search}
    />
  );
}
