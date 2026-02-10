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
 * GET /api/repos/[owner]/[repo]/contents
 * Fetches file tree or file contents
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
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') || '';
  const ref = searchParams.get('ref') || 'main';

  try {
    const url = path 
      ? `${GITHUB_CONFIG.apiUrl}/repos/${owner}/${repo}/contents/${path}?ref=${ref}`
      : `${GITHUB_CONFIG.apiUrl}/repos/${owner}/${repo}/contents?ref=${ref}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // If it's a file, decode content
    if (!Array.isArray(data) && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return NextResponse.json({
        success: true,
        data: {
          type: 'file',
          name: data.name,
          path: data.path,
          content,
          size: data.size,
          sha: data.sha,
        },
      });
    }

    // If it's a directory, return file list
    const files = data.map((item: any) => ({
      name: item.name,
      path: item.path,
      type: item.type === 'dir' ? 'dir' : 'file',
      size: item.size,
      sha: item.sha,
    }));

    return NextResponse.json({
      success: true,
      data: {
        type: 'dir',
        path: path || '/',
        files,
      },
    });
  } catch (error) {
    console.error('Contents fetch error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch contents',
    }, { status: 500 });
  }
}
