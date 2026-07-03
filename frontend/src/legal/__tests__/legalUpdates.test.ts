import { describe, expect, it } from 'vitest';
import {
  getChangedLegalDocuments,
  getLatestLegalAcknowledgements,
  latestLegalUpdates,
} from '../legalUpdates';

describe('legal update notice', () => {
  it('改定日前は表示しない', () => {
    expect(getChangedLegalDocuments({
      now: new Date('2026-07-02T23:59:59+09:00'),
      updates: latestLegalUpdates,
      acknowledgedRevisionDates: {},
    })).toHaveLength(0);
  });

  it('改定日以降で未同意なら表示する', () => {
    expect(getChangedLegalDocuments({
      now: new Date('2026-07-03T00:00:00+09:00'),
      updates: latestLegalUpdates,
      acknowledgedRevisionDates: {},
    })).toHaveLength(1);
  });

  it('同じ改定日を同意済みなら表示しない', () => {
    expect(getChangedLegalDocuments({
      now: new Date('2026-07-04T00:00:00+09:00'),
      updates: latestLegalUpdates,
      acknowledgedRevisionDates: getLatestLegalAcknowledgements(),
    })).toHaveLength(0);
  });
});
