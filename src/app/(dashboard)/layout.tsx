import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { DashboardClientWrapper } from "@/components/layout/DashboardClientWrapper";
import { headers } from "next/headers";

import { PageTransition } from "@/components/layout/PageTransition";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error || !session?.user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  const user = {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    roleId: profile.org_id || 'ACS_GLOBAL'
  };

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || "";

  if (pathname) {
    const pathSegments = pathname.split('/').filter(Boolean);
    const rolePrefix = pathSegments[0]; // e.g., 'admin', 'technician'
    
    const roleMap: Record<string, string> = {
      'ACS_ADMIN': 'admin',
      'OEM': 'oem',
      'DEALER': 'dealer',
      'PARTNER': 'partner',
      'TECHNICIAN': 'technician'
    };

    const expectedPrefix = roleMap[user.role];
    if (rolePrefix && expectedPrefix && rolePrefix !== expectedPrefix) {
      redirect(`/${expectedPrefix}/dashboard`);
    }
  }

  return (
    <DashboardClientWrapper user={user}>
      <PageTransition>{children}</PageTransition>
    </DashboardClientWrapper>
  );
}
