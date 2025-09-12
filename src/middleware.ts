import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user

  // Check email domain for authenticated users
  if (user) {
    const userEmail = user.email
    if (!userEmail || !userEmail.endsWith('@student.uobabylon.edu.iq')) {
      // Sign out invalid user
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  if (user && req.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/challenges', req.url))
  }

  return response
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/challenges'],
}