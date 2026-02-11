import { NextResponse } from 'next/server';
import { AI_PROVIDERS } from '@/lib/config';

/**
 * GET /api/copilot/providers
 * Returns the list of available AI providers (ones that have API keys configured)
 */
export async function GET() {
  const providers = Object.values(AI_PROVIDERS)
    .filter(p => !!p.apiKey)
    .map(p => ({
      id: p.id,
      name: p.name,
      defaultModel: p.defaultModel,
      models: p.models,
    }));

  return NextResponse.json({
    success: true,
    data: providers,
  });
}
