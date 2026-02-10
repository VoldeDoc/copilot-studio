import { NextResponse } from 'next/server';
import { GITHUB_CONFIG } from '@/lib/config';

/**
 * GET /api/auth/github
 * Redirects user to GitHub OAuth authorization page
 */
export async function GET() {
  const params = new URLSearchParams({
    client_id: GITHUB_CONFIG.clientId,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/github`,
    scope: GITHUB_CONFIG.scopes.join(' '),
    state: crypto.randomUUID(), // CSRF protection
  });

  const authUrl = `${GITHUB_CONFIG.authorizationUrl}?${params.toString()}`;
  
  return NextResponse.redirect(authUrl);
}
