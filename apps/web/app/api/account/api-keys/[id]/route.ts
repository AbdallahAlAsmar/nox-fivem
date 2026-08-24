import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@fivem-ai/db';

/**
 * Soft-revoke one of the caller's API keys (sets revokedAt). Scoped to the
 * AppUser row resolved from the Clerk session — a key id belonging to another
 * user resolves to null and 404s without leaking existence.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUser = await prisma.appUser.findUnique({
      where: { clerkUserId: userId },
      select: { id: true },
    });
    if (!appUser) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const key = await prisma.apiKey.findFirst({
      where: { id: params.id, userId: appUser.id },
      select: { id: true, revokedAt: true },
    });
    if (!key) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!key.revokedAt) {
      await prisma.apiKey.update({
        where: { id: key.id },
        data: { revokedAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
