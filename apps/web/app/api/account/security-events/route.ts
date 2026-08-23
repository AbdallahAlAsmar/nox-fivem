import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate dummy security events
    const events = [
      {
        id: 'evt_1',
        type: 'login' as const,
        message: 'Signed in from Chrome on Windows',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/120.0.0.0 Windows',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'evt_2',
        type: 'password_change' as const,
        message: 'Password changed',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/120.0.0.0 Windows',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'evt_3',
        type: 'api_key_created' as const,
        message: 'API key "Production Server" created',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/120.0.0.0 Windows',
        timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'evt_4',
        type: 'logout' as const,
        message: 'Signed out',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome/120.0.0.0 Windows',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching security events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
