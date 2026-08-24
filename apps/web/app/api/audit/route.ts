import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@fivem-ai/db';

async function getOrgContext(): Promise<{ orgId: string; userId: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // Resolve the caller's org from the provisioned AppUser row. The user may
  // not be provisioned yet if the orchestrator hasn't seen them before.
  const appUser = await prisma.appUser.findUnique({
    where: { clerkUserId: userId },
    select: { organizationId: true },
  });

  return {
    orgId: appUser?.organizationId ?? '',
    userId,
  };
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Signed in but not yet provisioned (no AppUser row): graceful empty list.
    if (!ctx.orgId) {
      return NextResponse.json({ logs: [] });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = filter ? {
      orgId: ctx.orgId,
      action: { contains: filter }
    } : { orgId: ctx.orgId };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, serverId, metadata } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Signed in but not yet provisioned: nothing to scope against — accept the
    // entry without a server link rather than failing the caller.
    if (!ctx.orgId) {
      const log = await prisma.auditLog.create({
        data: {
          orgId: null,
          userId: ctx.userId,
          serverId: null,
          action,
          metadata: metadata || {},
        },
      });
      return NextResponse.json({ id: log.id, ok: true });
    }

    // serverId is only accepted when it belongs to the caller's org.
    let scopedServerId: string | null = null;
    if (serverId) {
      const owned = await prisma.server.findFirst({
        where: { id: serverId, orgId: ctx.orgId },
        select: { id: true },
      });
      scopedServerId = owned?.id ?? null;
    }

    const log = await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        serverId: scopedServerId,
        action,
        metadata: metadata || {},
      },
    });

    return NextResponse.json({ id: log.id, ok: true });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 });
  }
}
