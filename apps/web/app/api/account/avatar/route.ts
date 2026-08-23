import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if file is provided
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate image type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid image type' }, { status: 400 });
    }

    // Validate image size (max 5MB)
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 400 });
    }

    // Update profile image via Clerk
    const client = await clerkClient();
    await client.users.updateUserProfileImage(userId, {
      file: image,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating avatar:', error);
    return NextResponse.json({ error: error.message || 'Failed to update avatar' }, { status: 400 });
  }
}
