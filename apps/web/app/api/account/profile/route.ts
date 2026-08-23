import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function PUT(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName } = body;

    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    // Clerk handles profile updates via their frontend SDK
    // This endpoint is for future backend integration
    // For now, return success to allow frontend to work
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 400 });
  }
}
