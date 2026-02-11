import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GITHUB_CONFIG, SESSION_CONFIG } from '@/lib/config';

/**
 * GET /api/auth/callback/github
 * Handles GitHub OAuth callback, exchanges code for access token
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=no_code', request.url)
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(GITHUB_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CONFIG.clientId,
        client_secret: GITHUB_CONFIG.clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(tokenData.error)}`, request.url)
      );
    }

    const { access_token } = tokenData;

    // Fetch user info
    const userResponse = await fetch(`${GITHUB_CONFIG.apiUrl}/user`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    // Create session data
    const sessionData = {
      user: {
        id: userData.id.toString(),
        login: userData.login,
        name: userData.name || userData.login,
        email: userData.email || '',
        avatarUrl: userData.avatar_url,
      },
      accessToken: access_token,
      expiresAt: Date.now() + SESSION_CONFIG.maxAge,
    };

    // Store session in HTTP-only cookie (encrypted in production)
    const cookieStore = await cookies();
    cookieStore.set('session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_CONFIG.maxAge / 1000,
      path: '/',
    });

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/?error=auth_failed', request.url)
    );
  }
}
