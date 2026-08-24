import React from 'react';
import SettingsClient from '@/components/SettingsClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('profiles').select('*, organizations(name)').eq('id', user.id).single();
  
  const userData = {
    email: user.email,
    name: profile?.name,
    role: profile?.role,
    organization: profile?.organizations?.name || 'N/A'
  };

  return <SettingsClient userData={userData} />;
}
