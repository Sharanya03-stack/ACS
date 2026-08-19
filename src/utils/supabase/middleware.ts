import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          // Clone request headers and add x-pathname
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set('x-pathname', request.nextUrl.pathname)
          
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/admin') ||
                           request.nextUrl.pathname.startsWith('/oem') ||
                           request.nextUrl.pathname.startsWith('/dealer') ||
                           request.nextUrl.pathname.startsWith('/partner') ||
                           request.nextUrl.pathname.startsWith('/technician') ||
                           request.nextUrl.pathname.startsWith('/dashboard') ||
                           request.nextUrl.pathname.startsWith('/profile') ||
                           request.nextUrl.pathname.startsWith('/settings');

  if (
    !user &&
    isProtectedRoute
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Handle route protection based on role if user is authenticated
  if (user && isProtectedRoute) {
    // Fetch profile to get role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role

    const path = request.nextUrl.pathname

    if (role === 'ACS_ADMIN' && !path.startsWith('/admin') && !path.startsWith('/profile') && !path.startsWith('/settings')) {
       return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    if (role === 'OEM' && !path.startsWith('/oem') && !path.startsWith('/profile') && !path.startsWith('/settings')) {
       return NextResponse.redirect(new URL('/oem/dashboard', request.url))
    }
    if (role === 'DEALER' && !path.startsWith('/dealer') && !path.startsWith('/profile') && !path.startsWith('/settings')) {
       return NextResponse.redirect(new URL('/dealer/dashboard', request.url))
    }
    if (role === 'PARTNER' && !path.startsWith('/partner') && !path.startsWith('/profile') && !path.startsWith('/settings')) {
       return NextResponse.redirect(new URL('/partner/dashboard', request.url))
    }
    if (role === 'TECHNICIAN' && !path.startsWith('/technician') && !path.startsWith('/profile') && !path.startsWith('/settings')) {
       return NextResponse.redirect(new URL('/technician/dashboard', request.url))
    }
  }

  return supabaseResponse
}
