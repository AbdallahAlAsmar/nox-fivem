import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate dummy API keys for demo
    const keys = [
      {
        id: 'key_1',
        name: 'Production Server',
        key: `nox_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsedAt: new Date().toISOString(),
        lastIp: '192.168.1.1',
      },
      {
        id: 'key_2',
        name: 'Development',
        key: `nox_test_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        lastUsedAt: undefined,
        lastIp: undefined,
      },
    ];

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate new API key
    const key = `nox_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;

    const newKey = {
      id: `key_${Date.now()}`,
      name,
      key,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ key: newKey });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, you would delete from database
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
