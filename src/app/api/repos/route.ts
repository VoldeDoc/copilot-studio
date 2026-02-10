import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GITHUB_CONFIG } from '@/lib/config';
import { Repository } from '@/types';

/**
 * Helper: Get access token from session
 */
async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  
  if (!sessionCookie) return null;
  
  try {
    const session = JSON.parse(sessionCookie.value);
    if (Date.now() > session.expiresAt) return null;
    return session.accessToken;
  } catch {
    return null;
  }
}

/**
 * GET /api/repos
 * Fetches user's GitHub repositories
 */
export async function GET(request: NextRequest) {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    return NextResponse.json({
      success: false,
      error: 'Not authenticated',
    }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '30');
  const sort = searchParams.get('sort') || 'updated';

  try {
    const response = await fetch(
      `${GITHUB_CONFIG.apiUrl}/user/repos?page=${page}&per_page=${perPage}&sort=${sort}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform to our Repository type
    const repositories: Repository[] = data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      description: repo.description,
      language: repo.language,
      defaultBranch: repo.default_branch,
      private: repo.private,
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      updatedAt: repo.updated_at,
      stargazers: repo.stargazers_count,
    }));

    return NextResponse.json({
      success: true,
      data: repositories,
    });
  } catch (error) {
    console.error('Repos fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch repositories',
    }, { status: 500 });
  }
}
