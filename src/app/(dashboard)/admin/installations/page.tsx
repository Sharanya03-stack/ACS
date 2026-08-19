import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { AdminInstallationsClient } from './AdminInstallationsClient';

export default async function AdminInstallationsPage() {
  const supabase = await createClient();

  const [
    { data: installations },
    { data: customers },
    { data: organizations },
    { data: profiles }
  ] = await Promise.all([
    supabase.from('installations').select('*').order('created_at', { ascending: false }),
    supabase.from('customers').select('*'),
    supabase.from('organizations').select('*'),
    supabase.from('profiles').select('*')
  ]);

  const installs = installations || [];
  const custs = customers || [];
  const orgs = organizations || [];
  const profs = profiles || [];

  const dealers = orgs.filter(o => o.type === 'DEALER');
  const partners = orgs.filter(o => o.type === 'PARTNER');
  const technicians = profs.filter(p => p.role === 'TECHNICIAN');

  return (
    <AdminInstallationsClient 
      initialInstallations={installs}
      customers={custs}
      dealers={dealers}
      partners={partners}
      technicians={technicians}
    />
  );
}
