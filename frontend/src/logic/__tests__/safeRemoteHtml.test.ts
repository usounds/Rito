import { describe, expect, it } from 'vitest';
import { createPinnedLookup, fetchSafeRemoteHtml, isPublicIpAddress } from '@/logic/safeRemoteHtml';

describe('safeRemoteHtml', () => {
  it.each([
    '127.0.0.1',
    '10.0.0.1',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '::1',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('内部・予約IP %s を拒否する', (address) => {
    expect(isPublicIpAddress(address)).toBe(false);
  });

  it.each(['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])(
    '公開IP %s を許可する',
    (address) => {
      expect(isPublicIpAddress(address)).toBe(true);
    },
  );

  it.each(['http://127.0.0.1/private', 'http://[::1]/private', 'ftp://example.com/file'])(
    '危険な取得先 %s を接続前に拒否する',
    async (url) => {
      await expect(fetchSafeRemoteHtml(url)).rejects.toMatchObject({ status: expect.any(Number) });
    },
  );

  it('Node.jsのall lookupでは固定IPを配列形式で返す', async () => {
    const pinned = { address: '1.1.1.1', family: 4 as const };
    const lookup = createPinnedLookup(pinned);

    await new Promise<void>((resolve, reject) => {
      lookup('example.com', { all: true }, (error, address, family) => {
        try {
          expect(error).toBeNull();
          expect(address).toEqual([pinned]);
          expect(family).toBeUndefined();
          resolve();
        } catch (assertionError) {
          reject(assertionError);
        }
      });
    });
  });

  it('単一lookupでは固定IPとfamilyを従来形式で返す', async () => {
    const pinned = { address: '1.1.1.1', family: 4 as const };
    const lookup = createPinnedLookup(pinned);

    await new Promise<void>((resolve, reject) => {
      lookup('example.com', { all: false }, (error, address, family) => {
        try {
          expect(error).toBeNull();
          expect(address).toBe(pinned.address);
          expect(family).toBe(pinned.family);
          resolve();
        } catch (assertionError) {
          reject(assertionError);
        }
      });
    });
  });
});
