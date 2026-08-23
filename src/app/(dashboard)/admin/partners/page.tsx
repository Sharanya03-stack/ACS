import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { AdminPartnersClient } from './AdminPartnersClient';
import { redirect } from 'next/navigation';

export default async function AdminPartnersPage({
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
      id, name, type, contact_email, contact_phone, status, created_at
    `, { count: 'exact' })
    .eq('type', 'PARTNER');

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data: partners, count } = await query.order('created_at', { ascending: false });

  return (
    <AdminPartnersClient 
      partners={partners || []} 
      totalCount={count || 0}
      initialSearch={search}
    />
  );
}
