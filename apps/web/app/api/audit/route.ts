import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@fivem-ai/db';

// Get org context from request headers or cookies
function getOrgContext(request: NextRequest) {
  // In production, this would come from Clerk auth
  // For now, use a default org for development
  return { orgId: 'dev-org', userId: null };
}

export async function GET(request: NextRequest) {
  try {
    const { orgId } = getOrgContext(request);

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where = filter ? {
      orgId,
      action: { contains: filter }
    } : { orgId };

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
    const { orgId } = getOrgContext(request);

    const body = await request.json();
    const { action, serverId, metadata } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const log = await prisma.auditLog.create({
      data: {
        orgId,
        serverId,
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
