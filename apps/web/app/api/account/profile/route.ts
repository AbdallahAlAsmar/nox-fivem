import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * Update the signed-in user's display name in Clerk by splitting fullName
 * into firstName/lastName. Same backend-SDK pattern as the avatar route
 * (`await clerkClient()` with CLERK_SECRET_KEY).
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName } = body;

    if (!fullName || typeof fullName !== 'string') {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    const name = fullName.trim();
    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 characters or fewer' }, { status: 400 });
    }

    const client = await clerkClient();
    await client.users.updateUser(userId, {
      // "First" alone keeps everything in firstName; empty string clears the name.
      firstName: name,
      lastName: '',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 400 });
  }
}
