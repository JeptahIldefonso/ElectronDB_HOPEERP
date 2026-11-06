import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/actions/auth';
import { checkDatabaseHealth } from '@/lib/db-health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          connected: false,
          status: 'disconnected',
          reason: 'unauthorized',
          message: 'Unauthorized: login required',
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const forceFresh = searchParams.get('fresh') === '1';

    const health = await checkDatabaseHealth(forceFresh);
    return NextResponse.json(health);
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
