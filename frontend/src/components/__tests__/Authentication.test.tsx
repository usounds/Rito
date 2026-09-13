import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test-utils';
import { Authentication } from '../Authentication';
import { getAtPassport } from '@/logic/HandleAtPassport';
import { resolveHandleViaHttp } from '@/logic/HandleDidredolver';

const mockSetHandle = vi.fn();
const mockSetIsLoginProcess = vi.fn();
const mockGet = vi.fn().mockResolvedValue({ ok: true, data: { actors: [] } });

vi.mock('@/state/XrpcAgent', () => ({
  useXrpcAgentStore: vi.fn((selector) => {
    const state = {
      handle: '',
      setHandle: mockSetHandle,
      setIsLoginProcess: mockSetIsLoginProcess,
      publicAgent: { get: mockGet },
    };
    return selector(state);
  }),
}));

vi.mock('@/logic/HandleDidredolver', () => ({
  resolveHandleViaHttp: vi.fn().mockResolvedValue('did:plc:testuser'),
  resolveHandleViaDoH: vi.fn().mockResolvedValue('did:plc:testuser'),
}));

vi.mock('nextjs-toploader', () => ({
  useTopLoader: () => ({
    start: vi.fn(),
    done: vi.fn(),
  }),
}));

const mockGenerateAuthUrl = vi.fn(() => ({
  url: 'https://atpassport.net/ja/authentication?mock=1',
  atpstate: 'atpstate-mock-uuid',
}));
const mockRequestHandleAssist = vi.fn();

vi.mock('@/logic/HandleAtPassport', () => ({
  getAtPassport: vi.fn(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    requestHandleAssist: mockRequestHandleAssist,
  })),
}));

describe('Authentication with FedCM support', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.cookie = '';

    delete (window as any).location;
    window.location = {
      ...originalLocation,
      href: 'https://rito.blue/ja',
      origin: 'https://rito.blue',
      assign: vi.fn(),
    } as any;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/csrf') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ csrfToken: 'csrf-123' }),
        } as Response);
      }
      if (url === '/api/oauth/login') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ url: 'https://bsky.social/oauth/authorize?req=1' }),
        } as Response);
      }
      return Promise.reject(new Error('Unknown url: ' + url));
    });
  });

  afterEach(() => {
    (window as any).location = originalLocation;
  });

  it('FedCMが成功した場合、取得したハンドルで即座にログイン処理を実行する', async () => {
    const user = userEvent.setup();

    mockRequestHandleAssist.mockResolvedValueOnce({
      username: 'alice.bsky.social',
      did: 'did:plc:alice123',
      token: 'mock-token',
    });

    render(<Authentication lang="ja" />);

    // 利用規約に同意
    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    // @passportでログイン ボタンをクリック
    const passportButton = screen.getByRole('button', { name: /@passportでログイン/i });
    await user.click(passportButton);

    await waitFor(() => {
      expect(mockRequestHandleAssist).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockSetHandle).toHaveBeenCalledWith('alice.bsky.social');
      expect(resolveHandleViaHttp).toHaveBeenCalledWith('alice.bsky.social');
      expect(global.fetch).toHaveBeenCalledWith('/api/oauth/login', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"handle":"alice.bsky.social"'),
      }));
      expect(window.location.href).toBe('https://bsky.social/oauth/authorize?req=1');
    });
  });

  it('FedCMダイアログがユーザーによってキャンセルされた場合（null返却）、フォールバックや遷移を行わない', async () => {
    const user = userEvent.setup();

    mockRequestHandleAssist.mockResolvedValueOnce(null);

    render(<Authentication lang="ja" />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const passportButton = screen.getByRole('button', { name: /@passportでログイン/i });
    await user.click(passportButton);

    await waitFor(() => {
      expect(mockRequestHandleAssist).toHaveBeenCalledTimes(1);
    });

    expect(mockGenerateAuthUrl).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalledWith('/api/oauth/login', expect.anything());
    expect(window.location.href).toBe('https://rito.blue/ja');
  });

  it('FedCM非対応やエラー時にfallbackが実行され、@passportのWeb認証へリダイレクトする', async () => {
    const user = userEvent.setup();

    mockRequestHandleAssist.mockImplementationOnce(async (options: any) => {
      if (options?.fallback) {
        return await options.fallback();
      }
      return null;
    });

    render(<Authentication lang="ja" />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const passportButton = screen.getByRole('button', { name: /@passportでログイン/i });
    await user.click(passportButton);

    await waitFor(() => {
      expect(mockRequestHandleAssist).toHaveBeenCalledTimes(1);
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        returnTo: 'https://rito.blue/ja',
      });
      expect(document.cookie).toContain('atpstate=atpstate-mock-uuid');
      expect(window.location.href).toBe('https://atpassport.net/ja/authentication?mock=1');
    });
  });
});
