import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/services/storage-cleanup.service', () => ({
  cleanupOrphanedUploads: vi.fn(),
}));

import { GET } from '../route';
import { cleanupOrphanedUploads } from '@/services/storage-cleanup.service';

function makeRequest(authHeader?: string) {
  return new NextRequest('http://localhost/api/v1/cron/cleanup-orphaned-uploads', {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'test-secret';
});

afterEach(() => {
  process.env.CRON_SECRET = ORIGINAL_CRON_SECRET;
});

describe('GET /api/v1/cron/cleanup-orphaned-uploads', () => {
  it('returns 401 when the bearer token does not match CRON_SECRET', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'));

    expect(res.status).toBe(401);
    expect(cleanupOrphanedUploads).not.toHaveBeenCalled();
  });

  it('runs the cleanup when the bearer token matches', async () => {
    vi.mocked(cleanupOrphanedUploads).mockResolvedValue({ scanned: 10, deleted: 3 });

    const res = await GET(makeRequest('Bearer test-secret'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, scanned: 10, deleted: 3 });
  });
});
