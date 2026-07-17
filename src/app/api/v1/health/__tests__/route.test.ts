import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryRawMock } = vi.hoisted(() => ({ queryRawMock: vi.fn() }));
vi.mock('@/lib/db', () => ({
  db: { $queryRaw: queryRawMock },
}));

import { GET } from '../route';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/health', () => {
  it('returns ok when the database is reachable', async () => {
    queryRawMock.mockResolvedValue([{ '?column?': 1 }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
  });

  it('returns 503 when the database is unreachable', async () => {
    queryRawMock.mockRejectedValue(new Error('connection refused'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe('error');
  });
});
