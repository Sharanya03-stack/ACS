import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { DashboardClientWrapper } from "@/components/layout/DashboardClientWrapper";
import { headers } from "next/headers";

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
  // Using x-invoke-path to get current path on server in app router is unreliable,
  // but we can just use the middleware to pass it, or parse it from headers if needed.
  // Wait! A better way to check role in layout is to get the current URL.
  // Actually, in App Router layout Server Components, we cannot get the current pathname reliably without middleware.
  // But wait! We DO have middleware. Let's just use the `x-current-path` header if we added it,
  // OR we can rely on page-level checks, OR since it's a layout inside `(dashboard)`, it wraps everything.
  // We can let the middleware handle route protection, or we can check the URL via a header if available.
  const pathname = headersList.get('x-pathname') || "";

  // If x-pathname is not set, we can just allow the client to handle the visual mismatch,
  // but for strict server security, we should ideally set it in middleware.
  // Let's implement strict role isolation guard on the server using the pathname from headers if present.
  
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
      {children}
    </DashboardClientWrapper>
  );
}
