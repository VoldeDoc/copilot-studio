import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GITHUB_CONFIG } from '@/lib/config';

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

interface RouteParams {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

/**
 * GET /api/repos/[owner]/[repo]
 * Fetches repository details including branches
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    return NextResponse.json({
      success: false,
      error: 'Not authenticated',
    }, { status: 401 });
  }

  const { owner, repo } = await params;

  try {
    // Fetch repo details and branches in parallel
    const [repoResponse, branchesResponse] = await Promise.all([
      fetch(`${GITHUB_CONFIG.apiUrl}/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }),
      fetch(`${GITHUB_CONFIG.apiUrl}/repos/${owner}/${repo}/branches`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }),
    ]);

    if (!repoResponse.ok || !branchesResponse.ok) {
      throw new Error('Failed to fetch repository data');
    }

    const repoData = await repoResponse.json();
    const branchesData = await branchesResponse.json();

    // Transform branches
    const branches = branchesData.map((branch: any) => ({
      name: branch.name,
      commit: {
        sha: branch.commit.sha,
        message: '', // Would need additional API call
        author: '',
        date: '',
      },
      protected: branch.protected,
    }));

    return NextResponse.json({
      success: true,
      data: {
        repository: {
          id: repoData.id,
          name: repoData.name,
          fullName: repoData.full_name,
          owner: repoData.owner.login,
          description: repoData.description,
          language: repoData.language,
          defaultBranch: repoData.default_branch,
          private: repoData.private,
          url: repoData.html_url,
          cloneUrl: repoData.clone_url,
          updatedAt: repoData.updated_at,
          stargazers: repoData.stargazers_count,
        },
        branches,
      },
    });
  } catch (error) {
    console.error('Repo fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch repository',
    }, { status: 500 });
  }
}
