import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api(.*)',
  '/__clerk/(.*)',
  '/clerk.browser.js',
]);

export default clerkMiddleware((auth, request) => {
  if (isPublicRoute(request)) return;
  
  const { userId, redirectToSignIn } = auth();
  
  // If not authenticated, redirect to sign-in
  if (!userId) {
    return redirectToSignIn();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|font|png|ico|webp|svg|txt|md|json)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
    '/clerk.browser.js',
  ],
};
