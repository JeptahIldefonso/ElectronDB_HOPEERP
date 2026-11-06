import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-anon-key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid using getSession() on server/middleware; use getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route protection
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isPublicStatic = 
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.');

  // Allow static assets freely
  if (isPublicStatic) {
    return supabaseResponse;
  }

  // Redirect to home if logged in and visiting login page
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Note: For demo accounts, demo mode is enabled in Task 3 actions
  return supabaseResponse;
}
