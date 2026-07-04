export type LegalDocumentType = 'terms' | 'privacy';

export type LegalUpdate = {
  document: LegalDocumentType;
  revisionDate: string;
  path: 'tos' | 'privacy';
};

export type LegalAcknowledgements = Partial<Record<LegalDocumentType, string | null>>;

export const latestLegalUpdates: LegalUpdate[] = [
  {
    document: 'terms',
    revisionDate: '2026-07-04',
    path: 'tos',
  },
];

export function getLegalNoticeStorageKey(document: LegalDocumentType) {
  return `rito_legal_notice_seen_${document}`;
}

export function getLegalDocumentPath(document: LegalDocumentType) {
  return document === 'terms' ? 'tos' : 'privacy';
}

export function getLegalRevisionTime(revisionDate: string) {
  return new Date(`${revisionDate}T00:00:00+09:00`).getTime();
}

export function getLatestLegalAcknowledgements(updates = latestLegalUpdates): LegalAcknowledgements {
  return updates.reduce<LegalAcknowledgements>((acknowledgements, update) => {
    acknowledgements[update.document] = update.revisionDate;
    return acknowledgements;
  }, {});
}

export function getChangedLegalDocuments({
  now,
  updates = latestLegalUpdates,
  acknowledgedRevisionDates,
}: {
  now: Date;
  updates?: LegalUpdate[];
  acknowledgedRevisionDates: LegalAcknowledgements;
}) {
  return updates.filter(update =>
    now.getTime() >= getLegalRevisionTime(update.revisionDate)
    && acknowledgedRevisionDates[update.document] !== update.revisionDate
  );
}

export function hasAcceptedLatestLegalUpdates({
  now,
  updates = latestLegalUpdates,
  acknowledgedRevisionDates,
}: {
  now: Date;
  updates?: LegalUpdate[];
  acknowledgedRevisionDates: LegalAcknowledgements;
}) {
  return getChangedLegalDocuments({ now, updates, acknowledgedRevisionDates }).length === 0;
}
