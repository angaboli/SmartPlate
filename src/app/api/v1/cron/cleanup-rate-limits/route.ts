import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredAttempts } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deleted = await cleanupExpiredAttempts();

  return NextResponse.json({ success: true, deleted });
}
