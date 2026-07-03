'use client';

import { useEffect, useState } from 'react';
import { Button, Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePreferenceStore } from '@/state/Preference';
import { useXrpcAgentStore } from '@/state/XrpcAgent';
import {
  getChangedLegalDocuments,
  getLegalRevisionTime,
  latestLegalUpdates,
  type LegalAcknowledgements,
  type LegalUpdate,
} from '@/legal/legalUpdates';

type LegalUpdateNoticeProps = {
  locale: string;
};

function getAcknowledgementFromPreference(preference: Record<string, unknown>): LegalAcknowledgements {
  const toRevisionDate = (value: unknown) => typeof value === 'string' && value.trim().length > 0
    ? value
    : null;

  return {
    terms: toRevisionDate(preference.termsNoticeAcknowledgedRevisionDate),
    privacy: toRevisionDate(preference.privacyNoticeAcknowledgedRevisionDate),
  };
}

export function LegalUpdateNotice({ locale }: LegalUpdateNoticeProps) {
  const t = useTranslations('legalUpdateNotice');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changedUpdates, setChangedUpdates] = useState<LegalUpdate[]>([]);
  const activeDid = useXrpcAgentStore(state => state.activeDid);
  const setTermsNoticeAcknowledgedRevisionDate = usePreferenceStore(
    state => state.setTermsNoticeAcknowledgedRevisionDate
  );
  const setPrivacyNoticeAcknowledgedRevisionDate = usePreferenceStore(
    state => state.setPrivacyNoticeAcknowledgedRevisionDate
  );
  const setLegalAcknowledgementsLoaded = usePreferenceStore(
    state => state.setLegalAcknowledgementsLoaded
  );
  const setLegalAcknowledgementsFetchedFromPreference = usePreferenceStore(
    state => state.setLegalAcknowledgementsFetchedFromPreference
  );
  const latestChangedUpdate = changedUpdates.reduce<LegalUpdate | null>((latest, update) => {
    if (!latest || getLegalRevisionTime(update.revisionDate) > getLegalRevisionTime(latest.revisionDate)) {
      return update;
    }
    return latest;
  }, null);
  const documentSeparator = locale.startsWith('ja') ? '、' : ' and ';

  async function fetchPreferenceAcknowledgement() {
    const { csrfToken } = await fetch('/api/csrf').then(response => response.json());
    const authResponse = await fetch('/api/oauth/getServideAuth?lxm=blue.rito.preference.getPreference', {
      headers: {
        'x-csrf-token': csrfToken,
      },
    });

    if (!authResponse.ok) {
      return null;
    }

    const { token } = await authResponse.json();
    const preferenceResponse = await fetch('/xrpc/blue.rito.preference.getPreference', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!preferenceResponse.ok) {
      return null;
    }

    const preference = await preferenceResponse.json() as Record<string, unknown>;
    return getAcknowledgementFromPreference(preference);
  }

  async function savePreferenceAcknowledgement(acknowledgements: LegalAcknowledgements) {
    const payload = Object.fromEntries(
      Object.entries({
        termsNoticeAcknowledgedRevisionDate: acknowledgements.terms,
        privacyNoticeAcknowledgedRevisionDate: acknowledgements.privacy,
      }).filter(([, value]) => typeof value === 'string' && value.length > 0)
    );

    if (Object.keys(payload).length === 0) {
      return;
    }

    const { csrfToken } = await fetch('/api/csrf').then(response => response.json());
    const authResponse = await fetch('/api/oauth/getServideAuth?lxm=blue.rito.preference.putPreference', {
      headers: {
        'x-csrf-token': csrfToken,
      },
    });

    if (!authResponse.ok) {
      return;
    }

    const { token } = await authResponse.json();
    await fetch('/xrpc/blue.rito.preference.putPreference', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  }

  useEffect(() => {
    let cancelled = false;

    setLegalAcknowledgementsLoaded(false);
    setLegalAcknowledgementsFetchedFromPreference(false);
    setTermsNoticeAcknowledgedRevisionDate(null);
    setPrivacyNoticeAcknowledgedRevisionDate(null);

    async function loadAcknowledgement() {
      if (!activeDid) {
        if (!cancelled) {
          setChangedUpdates([]);
          setVisible(false);
          setLegalAcknowledgementsLoaded(true);
          setTermsNoticeAcknowledgedRevisionDate(null);
          setPrivacyNoticeAcknowledgedRevisionDate(null);
        }
        return;
      }

      let preferenceAcknowledgements: LegalAcknowledgements | null = null;

      try {
        preferenceAcknowledgements = await fetchPreferenceAcknowledgement();
        if (!preferenceAcknowledgements) {
          if (!cancelled) {
            setChangedUpdates([]);
            setVisible(false);
            setLegalAcknowledgementsLoaded(true);
          }
          return;
        }

        setLegalAcknowledgementsFetchedFromPreference(true);

        const acknowledgedRevisionDates = preferenceAcknowledgements;
        for (const update of latestLegalUpdates) {
          const revisionDate = acknowledgedRevisionDates[update.document];
          if (revisionDate) {
            if (update.document === 'terms') {
              setTermsNoticeAcknowledgedRevisionDate(revisionDate);
            } else {
              setPrivacyNoticeAcknowledgedRevisionDate(revisionDate);
            }
          } else {
            if (update.document === 'terms') {
              setTermsNoticeAcknowledgedRevisionDate(null);
            } else {
              setPrivacyNoticeAcknowledgedRevisionDate(null);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setChangedUpdates([]);
          setVisible(false);
          setLegalAcknowledgementsLoaded(true);
        }
        return;
      }

      const updates = getChangedLegalDocuments({
        now: new Date(),
        updates: latestLegalUpdates,
        acknowledgedRevisionDates: preferenceAcknowledgements as LegalAcknowledgements,
      });

      if (!cancelled) {
        setChangedUpdates(updates);
        setVisible(updates.length > 0);
        setLegalAcknowledgementsLoaded(true);
      }
    }

    loadAcknowledgement();

    return () => {
      cancelled = true;
    };
  }, [
    activeDid,
    setLegalAcknowledgementsLoaded,
    setLegalAcknowledgementsFetchedFromPreference,
    setPrivacyNoticeAcknowledgedRevisionDate,
    setTermsNoticeAcknowledgedRevisionDate,
  ]);

  const acknowledge = async () => {
    const acknowledgements = changedUpdates.reduce<LegalAcknowledgements>((result, update) => {
      result[update.document] = update.revisionDate;
      return result;
    }, {});

    for (const update of changedUpdates) {
      if (update.document === 'terms') {
        setTermsNoticeAcknowledgedRevisionDate(update.revisionDate);
      } else {
        setPrivacyNoticeAcknowledgedRevisionDate(update.revisionDate);
      }
    }

    setVisible(false);

    if (activeDid) {
      try {
        setSaving(true);
        await savePreferenceAcknowledgement(acknowledgements);
      } catch {
        // Local acknowledgement is enough to avoid repeatedly blocking the user.
      } finally {
        setSaving(false);
      }
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Card
      radius="md"
      withBorder
      p="md"
      style={{
        background: 'light-dark(rgba(239, 246, 255, 0.96), rgba(8, 15, 29, 0.96))',
        borderColor: 'light-dark(rgba(34, 139, 230, 0.28), rgba(116, 192, 252, 0.36))',
        boxShadow: 'light-dark(0 10px 30px rgba(15, 23, 42, 0.08), 0 14px 36px rgba(0, 0, 0, 0.35))',
        margin: '12px auto 0',
        maxWidth: 960,
        width: 'calc(100% - 24px)',
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" gap="md">
          <Group align="flex-start" gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 240 }}>
            <ThemeIcon
              color="blue"
              radius="xl"
              size={30}
              variant="light"
              style={{ flex: '0 0 30px', marginTop: 2 }}
            >
              <FileText size={16} />
            </ThemeIcon>
            <Text
              size="sm"
              lh={1.6}
              style={{
                color: 'light-dark(var(--mantine-color-gray-9), var(--mantine-color-blue-0))',
              }}
            >
              {t('message', {
                date: latestChangedUpdate?.revisionDate ?? latestLegalUpdates[0]?.revisionDate ?? '',
                documents: changedUpdates.map((update) => t(update.document)).join(documentSeparator),
              })}
            </Text>
          </Group>
          <Group gap="xs" justify="flex-end" wrap="wrap">
            {changedUpdates.map((update) => (
              <Button
                key={update.document}
                component={Link}
                href={`/${locale}/${update.path}`}
                size="xs"
                variant="light"
              >
                {t(update.document)}
              </Button>
            ))}
          </Group>
        </Group>
        <Group justify="flex-end">
          <Button
            onClick={() => { void acknowledge(); }}
            size="xs"
            variant="filled"
            disabled={saving}
          >
            {t('agree')}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
