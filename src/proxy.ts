import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Handle locale from cookie or default
  const response = NextResponse.next();

  // Check if locale cookie exists, if not set default
  if (!request.cookies.has('locale')) {
    response.cookies.set('locale', 'en', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
