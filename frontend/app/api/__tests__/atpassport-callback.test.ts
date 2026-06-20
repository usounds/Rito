import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const parseCallback = vi.fn();

vi.mock('@/logic/HandleAtPassport', () => ({
  getAtPassport: () => ({ parseCallback }),
}));

vi.mock('@/logic/HandleOauthClientNode', () => ({
  getOAuthClient: vi.fn(),
}));

import { GET } from '@app/api/atpassport/callback/route';

describe('API: /api/atpassport/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_URL', 'https://rito.blue');
  });

  it('内部ホストで受信しても公開URLへフォールバックする', async () => {
    parseCallback.mockImplementation(() => {
      throw new Error('Invalid atpstate');
    });

    const response = await GET(
      new NextRequest('https://0.0.0.0:3000/api/atpassport/callback'),
    );

    expect(response.headers.get('location')).toBe('https://rito.blue/');
  });

  it('検証済みのreturnToを公開URL上で維持する', async () => {
    parseCallback.mockReturnValue({
      handle: '',
      customParams: { returnTo: 'https://rito.blue/ja' },
    });

    const response = await GET(
      new NextRequest('https://0.0.0.0:3000/api/atpassport/callback'),
    );

    expect(response.headers.get('location')).toBe('https://rito.blue/ja');
  });

  it('異なるoriginのreturnToは公開URLへフォールバックする', async () => {
    parseCallback.mockReturnValue({
      handle: '',
      customParams: { returnTo: 'https://example.com/' },
    });

    const response = await GET(
      new NextRequest('https://0.0.0.0:3000/api/atpassport/callback'),
    );

    expect(response.headers.get('location')).toBe('https://rito.blue/');
  });
});
