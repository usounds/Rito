'use client';

import { useEffect, useState } from 'react';
import { Card, Text, Button, Group, Affix, Transition } from '@mantine/core';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

type CookieConsentProps = {
  locale: string;
};

export function CookieConsent({ locale }: CookieConsentProps) {
  const t = useTranslations('cookieConsent');
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // クッキーが存在するか確認
    const cookies = document.cookie.split('; ');
    const hasConsent = cookies.some(row => row.trim().startsWith('cookie-consent='));
    if (!hasConsent) {
      // 最初の読み込み時に少し遅延させて表示（アニメーション効果）
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!mounted) return null;

  const handleConsent = (granted: boolean) => {
    const value = granted ? 'granted' : 'denied';
    
    // クッキーを設定（有効期限365日、セキュア、Lax）
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `cookie-consent=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax; Secure`;

    // Google Analytics の同意ステータスを更新
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        'analytics_storage': value,
        'ad_storage': value,
        'ad_user_data': value,
        'ad_personalization': value
      });
    }

    setVisible(false);
  };

  return (
    <Affix position={{ bottom: 20, left: 20, right: 20 }} zIndex={1000}>
      <Transition mounted={visible} transition="slide-up" duration={400} timingFunction="ease">
        {(transitionStyles) => (
          <Card
            style={{
              ...transitionStyles,
              maxWidth: 560,
              marginLeft: 'auto',
              marginRight: 'auto',
              background: 'light-dark(rgba(255, 255, 255, 0.88), rgba(11, 15, 25, 0.88))',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid light-dark(rgba(0, 0, 0, 0.08), rgba(255, 255, 255, 0.08))',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
              borderRadius: 'var(--mantine-radius-md)',
            }}
            p="md"
            withBorder
          >
            <Text size="sm" mb="sm" style={{ color: 'light-dark(var(--mantine-color-gray-8), var(--mantine-color-dark-0))', lineHeight: 1.6 }}>
              {t('message')}{' '}
              <Link
                href={`/${locale}/privacy`}
                style={{
                  color: '#228be6',
                  textDecoration: 'underline',
                  fontWeight: 500,
                  marginLeft: 4,
                }}
              >
                {t('readMore')}
              </Link>
            </Text>
            <Group justify="flex-end" gap="xs">
              <Button
                variant="subtle"
                size="xs"
                color="gray"
                onClick={() => handleConsent(false)}
                style={{
                  color: 'light-dark(var(--mantine-color-gray-6), var(--mantine-color-dark-3))',
                }}
              >
                {t('decline')}
              </Button>
              <Button
                size="xs"
                onClick={() => handleConsent(true)}
                style={{
                  backgroundColor: '#228be6',
                }}
              >
                {t('accept')}
              </Button>
            </Group>
          </Card>
        )}
      </Transition>
    </Affix>
  );
}
