import { type NextRequest, NextResponse } from 'next/server';

import { COOKIE_ACCESS } from '@/constants/auth';
import { ROUTES, isPublicRoute } from '@/constants/routes';

export function proxy(req: NextRequest) {
  const hasAccess = req.cookies.has(COOKIE_ACCESS);
  const path = req.nextUrl.pathname;
  const publicRoute = isPublicRoute(path);

  if (!hasAccess && !publicRoute) {
    const url = req.nextUrl.clone();
    url.pathname = ROUTES.LOGIN;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\..*).*)',
  ],
};
