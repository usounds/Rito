import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/logic/HandleOauthClientNode', () => ({
  getOAuthClient: vi.fn().mockResolvedValue({
    callback: vi.fn().mockResolvedValue({
      session: {
        did: 'did:plc:testuser',
        sub: 'did:plc:testuser',
      },
    }),
  }),
}));

vi.mock('@atproto/api', () => ({
  Agent: class {
    did: string;
    getProfile = vi.fn().mockResolvedValue({});

    constructor(session: { did?: string }) {
      this.did = session.did ?? 'did:plc:testuser';
    }
  },
}));

vi.mock('@/logic/HandlePrismaClient', () => ({
  prisma: {
    userDidHandle: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    nodeOAuthSession: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.stubEnv('NEXT_PUBLIC_URL', 'https://rito.blue');

import { prisma } from '@/logic/HandlePrismaClient';
import { GET } from '@app/api/oauth/callback/route';

describe('API: /api/oauth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('OAuth成功時に最新の同意日を保存する', async () => {
    const req = new NextRequest('https://rito.blue/api/oauth/callback?code=valid');
    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(prisma.userDidHandle.upsert).toHaveBeenCalledWith({
      where: { did: 'did:plc:testuser' },
      update: {
        terms_notice_acknowledged_revision_date: '2026-07-04',
      },
      create: {
        did: 'did:plc:testuser',
        terms_notice_acknowledged_revision_date: '2026-07-04',
      },
    });
  });
});
