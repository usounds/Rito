import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authorize, parseCallback } = vi.hoisted(() => ({
  authorize: vi.fn(),
  parseCallback: vi.fn(),
}));

vi.mock('@/logic/HandleAtPassport', () => ({
  getAtPassport: () => ({ parseCallback }),
}));

vi.mock('@/logic/HandleOauthClientNode', () => ({
  getOAuthClient: vi.fn().mockResolvedValue({ authorize }),
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
    expect(parseCallback).toHaveBeenCalledWith(
      'https://rito.blue/api/atpassport/callback',
      undefined,
    );
  });

  it('内部ホストで受信しても公開callback URLとして検証しOAuth認可へ進む', async () => {
    parseCallback.mockReturnValue({
      handle: 'usounds.work',
      customParams: { returnTo: 'https://rito.blue/ja' },
    });
    authorize.mockResolvedValue(new URL('https://bsky.social/oauth/authorize'));

    const request = new NextRequest(
      'https://0.0.0.0:3000/api/atpassport/callback?returnTo=https%3A%2F%2Frito.blue%2Fja&atpstate=expected',
    );
    request.cookies.set('atpstate', 'expected');

    const response = await GET(request);

    expect(parseCallback).toHaveBeenCalledWith(
      'https://rito.blue/api/atpassport/callback?returnTo=https%3A%2F%2Frito.blue%2Fja&atpstate=expected',
      'expected',
    );
    expect(authorize).toHaveBeenCalledWith('usounds.work');
    expect(response.headers.get('location')).toBe('https://bsky.social/oauth/authorize');
    expect(response.cookies.get('REDIRECT_TO')?.value).toBe('https://rito.blue/ja');
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
