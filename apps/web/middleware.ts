import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api(.*)',
  '/dist/(.*)',
  '/__clerk/(.*)',
  '/clerk.browser.js',
]);

const hasValidClerkConfig =
  /^pk_(test|live)_[\w+/=-]+$/.test(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '') &&
  /^sk_(test|live)_[\w+/=-]+$/.test(process.env.CLERK_SECRET_KEY || '');

const withClerk = hasValidClerkConfig ? clerkMiddleware((auth, request) => {
  if (isPublicRoute(request)) return;
  
  const { userId, redirectToSignIn } = auth();
  
  // If not authenticated, redirect to sign-in
  if (!userId) {
    return redirectToSignIn();
  }
}) : null;

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (!hasValidClerkConfig) {
    return new NextResponse(
      '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NOXES setup required</title><body style="margin:0;background:#0f0f14;color:#fff;font:16px system-ui;display:grid;min-height:100vh;place-items:center"><main style="max-width:600px;padding:40px"><p style="color:#3dffa2;font:12px monospace;letter-spacing:.2em;text-transform:uppercase">NOXES setup required</p><h1>Authentication is not configured</h1><p style="color:#aaa;line-height:1.6">Add valid Clerk keys to the web app environment before using NOXES.</p><p style="color:#ddd;font:13px monospace;line-height:2">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_… or pk_live_…<br>CLERK_SECRET_KEY=sk_test_… or sk_live_…</p></main></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  return withClerk!(request, event);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|font|png|ico|webp|svg|txt|md|json)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
    '/clerk.browser.js',
  ],
};
