import React from 'react';
import { createClient, getUserProfile } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getInstallations } from '@/utils/queries';
import OemDashboardClient from '../OemDashboardClient';

export default async function OemDashboard({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient();
  const profile = await getUserProfile();

  if (!profile || profile.role !== 'OEM') {
    redirect('/login');
  }

  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const category = typeof params.category === 'string' ? params.category : undefined;
  const dealer_id = typeof params.dealer_id === 'string' ? params.dealer_id : undefined;

  // Fetch OEM metrics & installations with OEM data isolation
  const [
    { count: totalDealers },
    { count: totalVehicles },
    { count: pendingInstallations },
    { count: completedInstallations },
    { data: recentInstallations, count: totalInstallations },
    { data: dealersData }
  ] = await Promise.all([
    supabase.from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'DEALER').eq('status', 'ACTIVE').eq('parent_org_id', profile.profile.org_id),
      
    supabase.from('vehicles')
      .select('*', { count: 'exact', head: true }),
      
    supabase.from('installations')
      .select('*', { count: 'exact', head: true })
      .eq('oem_id', profile.profile.org_id).in('status', ['PENDING_PARTNER', 'SCHEDULED', 'IN_PROGRESS']),
      
    supabase.from('installations')
      .select('*', { count: 'exact', head: true })
      .eq('oem_id', profile.profile.org_id).in('status', ['COMPLETED', 'VERIFIED', 'UNDER_VERIFICATION']),
      
    getInstallations(supabase, { page, search, status, category, dealer_id, oem_id: profile.profile.org_id || undefined }),
    
    supabase.from('organizations').select('id, display_id, name').eq('type', 'DEALER').eq('status', 'ACTIVE')
  ]);

  return (
    <OemDashboardClient
      installations={recentInstallations || []}
      totalCount={totalInstallations || 0}
      totalDealers={totalDealers || 0}
      totalVehicles={totalVehicles || 0}
      pendingInstallations={pendingInstallations || 0}
      completedInstallations={completedInstallations || 0}
      dealers={dealersData || []}
    />
  );
}
