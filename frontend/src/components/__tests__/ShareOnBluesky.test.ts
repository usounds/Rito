import { describe, expect, it } from 'vitest';
import { getRitoReferenceUrl } from '@/components/ShareOnBluesky';

describe('ShareOnBluesky private link policy', () => {
  it('プライベート共有ではリト参照URLを常に省略する', () => {
    expect(getRitoReferenceUrl('https://example.com/private', true, true)).toBeUndefined();
    expect(getRitoReferenceUrl('https://example.com/private', false, true)).toBeUndefined();
  });

  it('公開共有では従来の設定を維持する', () => {
    expect(getRitoReferenceUrl('https://rito.blue/details', true, false)).toBe('https://rito.blue/details');
    expect(getRitoReferenceUrl('https://rito.blue/details', false, false)).toBeUndefined();
  });
});
