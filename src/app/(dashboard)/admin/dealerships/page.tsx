import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { AdminDealershipsClient } from './AdminDealershipsClient';
import { redirect } from 'next/navigation';

export default async function AdminDealershipsPage({
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
      oem:parent_org_id (id, name)
    `, { count: 'exact' })
    .eq('type', 'DEALER');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const [
    { data: dealers, count },
    { data: oems }
  ] = await Promise.all([
    query.order('created_at', { ascending: false }),
    supabase.from('organizations').select('id, name, status').eq('type', 'OEM').eq('status', 'ACTIVE')
  ]);

  return (
    <AdminDealershipsClient 
      dealers={dealers || []} 
      oems={oems || []}
      totalCount={count || 0}
      initialSearch={search}
    />
  );
}
