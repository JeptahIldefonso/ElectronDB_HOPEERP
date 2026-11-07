import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db-health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forceFresh = searchParams.get('fresh') === '1';

    const health = await checkDatabaseHealth(forceFresh);
    return NextResponse.json(health, {
      status: health.connected ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    console.error('[api/health/db] Uncaught health check error:', err);
    return NextResponse.json(
      {
        connected: false,
        status: 'disconnected',
        reason: 'query_failed',
        message: 'The server could not reach the database.',
      },
      { status: 500 }
    );
  }
}
