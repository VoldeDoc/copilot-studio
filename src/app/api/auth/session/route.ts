import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/session
 * Returns current user session data
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
      }, { status: 401 });
    }

    const session = JSON.parse(sessionCookie.value);

    // Check if session expired
    if (Date.now() > session.expiresAt) {
      cookieStore.delete('session');
      return NextResponse.json({
        success: false,
        error: 'Session expired',
      }, { status: 401 });
    }

    // Return user data without exposing the access token
    return NextResponse.json({
      success: true,
      data: {
        user: session.user,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({
      success: false,
      error: 'Invalid session',
    }, { status: 400 });
  }
}

/**
 * DELETE /api/auth/session
 * Logs out the user by clearing the session cookie
 */
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('session');

  return NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });
}
