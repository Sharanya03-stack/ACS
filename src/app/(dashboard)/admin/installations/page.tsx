import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { AdminInstallationsClient } from './AdminInstallationsClient';
import { getInstallations } from '@/utils/queries';

export default async function AdminInstallationsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const oem_id = typeof params.oem_id === 'string' ? params.oem_id : undefined;
  const dealer_id = typeof params.dealer_id === 'string' ? params.dealer_id : undefined;
  const partner_id = typeof params.partner_id === 'string' ? params.partner_id : undefined;
  const technician_id = typeof params.technician_id === 'string' ? params.technician_id : undefined;

  const [
    { data: installations, count },
    { data: organizations },
    { data: profiles }
  ] = await Promise.all([
    getInstallations(supabase, { page, search, status, category, oem_id, dealer_id, partner_id, technician_id }),
    supabase.from('organizations').select('id, name, type'),
    supabase.from('profiles').select('id, name, role')
  ]);

  const installs = installations || [];
  const orgs = organizations || [];
  const profs = profiles || [];

  const oems = orgs.filter(o => o.type === 'OEM');
  const dealers = orgs.filter(o => o.type === 'DEALER');
  const partners = orgs.filter(o => o.type === 'PARTNER');
  const technicians = profs.filter(p => p.role === 'TECHNICIAN');

  return (
    <AdminInstallationsClient 
      initialInstallations={installs}
      totalCount={count || 0}
      oems={oems}
      dealers={dealers}
      partners={partners}
      technicians={technicians}
    />
  );
}
