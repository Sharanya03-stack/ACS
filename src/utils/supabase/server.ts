import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { User } from '@supabase/supabase-js'

export type OrgType = 'OEM' | 'DEALER' | 'PARTNER' | 'ACS'
export type UserRole = 'ACS_ADMIN' | 'OEM' | 'DEALER' | 'PARTNER' | 'TECHNICIAN'

export interface Organization {
  id: string
  type: OrgType
  name: string
  parent_org_id?: string | null
}

export interface UserProfile {
  id: string
  role: UserRole
  org_id?: string | null
  name: string
  phone?: string | null
  status: string
}

export interface ResolvedIdentity {
  user: User
  profile: UserProfile
  role: UserRole
  organization: Organization | null
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function getUserProfile(): Promise<ResolvedIdentity | null> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  let organization: Organization | null = null;
  
  if (profile.org_id) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.org_id)
      .single();
      
    if (orgData) {
      organization = orgData;
    }
  }

  return {
    user,
    profile: profile as UserProfile,
    role: profile.role as UserRole,
    organization
  };
}
