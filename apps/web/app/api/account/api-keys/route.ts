import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as crypto from 'crypto';
import { prisma } from '@fivem-ai/db';

/**
 * Resolve the caller's provisioned AppUser row by Clerk user id — the same
 * pattern the audit route uses. Returns null when signed out, and a userId
 * of '' when signed in but not yet provisioned (no AppUser row).
 */
async function getAppUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const appUser = await prisma.appUser.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });

  return appUser?.id ?? '';
}

/** GET lists the caller's keys — never exposes hashes or plaintext tokens. */
export async function GET() {
  try {
    const appUserId = await getAppUserId();
    if (appUserId === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Not yet provisioned: graceful empty list rather than an error.
    if (appUserId === '') {
      return NextResponse.json({ keys: [] });
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: appUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST creates a key: 32 random bytes as `nox_<base64url>`. Only the sha256
 * hash is stored; the plaintext is returned ONCE in this response.
 */
export async function POST(request: NextRequest) {
  try {
    const appUserId = await getAppUserId();
    if (appUserId === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (appUserId === '') {
      return NextResponse.json(
        { error: 'Account not provisioned yet — try again shortly' },
        { status: 409 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) {
      return NextResponse.json({ error: 'Name is required (max 100 chars)' }, { status: 400 });
    }

    const token = `nox_${crypto.randomBytes(32).toString('base64url')}`;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const prefix = token.slice(0, 12);

    const key = await prisma.apiKey.create({
      data: { userId: appUserId, name, tokenHash, prefix },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    // The only time the plaintext token leaves the server.
    return NextResponse.json({ key: { ...key, key: token } });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
