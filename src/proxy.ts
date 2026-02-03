import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const protectedPaths = ['/dashboard', '/profile'];
const authPaths = ['/login', '/register'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth token in cookie or Authorization header
  const token =
    request.cookies.get('accessToken')?.value ??
    request.headers.get('authorization')?.replace('Bearer ', '');

  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const isAuthPage = authPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  // Redirect authenticated users away from login/register pages
  if (isAuthPage && token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret);
      const from = request.nextUrl.searchParams.get('from');
      const redirectTo = from || '/dashboard';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    } catch {
      // Token invalid, let them access auth pages
      return NextResponse.next();
    }
  }

  if (!isProtected) return NextResponse.next();

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/login', '/register'],
};
