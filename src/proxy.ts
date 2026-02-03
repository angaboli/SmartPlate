import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const protectedPaths = ['/dashboard', '/profile'];
const authPaths = ['/login', '/register'];

async function verifyToken(token: string): Promise<boolean> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('accessToken')?.value;

  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const isAuthPage = authPaths.includes(pathname);

  // Only verify token once if needed
  const isValidToken = token ? await verifyToken(token) : false;

  // Redirect authenticated users away from login/register
  if (isAuthPage && isValidToken) {
    const from = request.nextUrl.searchParams.get('from');
    return NextResponse.redirect(new URL(from || '/dashboard', request.url));
  }

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !isValidToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/login', '/register'],
};
