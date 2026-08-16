"use client";
import { Alert, Button, Group, Loader, Stack, Text } from '@mantine/core';
import { AlertCircle, CheckCircle2, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { PdsCapabilityStatus } from '@/logic/privateBookmark/types';

interface PdsCapabilityBannerProps {
  status: PdsCapabilityStatus;
  statusMessage?: string | null;
  onInitializeSpace?: () => void;
  onAuthorize?: () => void;
  isInitializing?: boolean;
}

export function PdsCapabilityBanner({
  status,
  statusMessage,
  onInitializeSpace,
  onAuthorize,
  isInitializing,
}: PdsCapabilityBannerProps) {
  if (status === 'ready' || status === 'idle') {
    return null;
  }

  if (status === 'checking') {
    return (
      <Alert
        variant="light"
        color="blue"
        title="PDSの対応状況を確認中"
        icon={<Loader size={18} />}
        my="md"
      >
        <Text size="sm">
          お使いのPDSがプライベートデータ機能（AT Protocol Permissioned Data）に対応しているか確認しています...
        </Text>
      </Alert>
    );
  }

  if (status === 'unsupported') {
    return (
      <Alert
        variant="light"
        color="yellow"
        title="PDSが現在プライベート機能に未対応です"
        icon={<AlertCircle size={20} />}
        my="md"
      >
        <Stack gap="xs">
          <Text size="sm">
            プライベートブックマークは AT Protocol Proposal 0016（Permissioned Data）に準拠して、ご自身のPDS内に暗号保護された専用Spaceとして保存されます。
          </Text>
          <Text size="xs" c="dimmed">
            現在、接続先のPDSに <code>com.atproto.space.*</code> 機能がまだ配備されていないため、このアカウントではプライベートブックマークをご利用いただけません。
          </Text>
          {statusMessage && (
            <Text size="xs" c="dimmed">
              詳細: {statusMessage}
            </Text>
          )}
        </Stack>
      </Alert>
    );
  }

  if (status === 'needs_auth') {
    return (
      <Alert
        variant="light"
        color="violet"
        title="追加のOAuth認可が必要です"
        icon={<ShieldAlert size={20} />}
        my="md"
      >
        <Stack gap="sm">
          <Text size="sm">
            プライベートブックマークのSpaceを読み書きするためには、<code>space:blue.rito.space.bookmark</code> スコープの認可が必要です。
          </Text>
          <Group>
            <Button
              variant="filled"
              color="violet"
              size="xs"
              leftSection={<Lock size={14} />}
              onClick={onAuthorize}
            >
              プライベート機能を認可する
            </Button>
          </Group>
        </Stack>
      </Alert>
    );
  }

  if (status === 'needs_space') {
    return (
      <Alert
        variant="light"
        color="indigo"
        title="プライベートSpaceの初期化"
        icon={<Sparkles size={20} />}
        my="md"
      >
        <Stack gap="sm">
          <Text size="sm">
            PDS上にあなた専用のプライベートSpace（<code>blue.rito.space.bookmark/self</code>）を作成して、プライベートブックマーク機能を有効化します。
          </Text>
          <Group>
            <Button
              variant="filled"
              color="indigo"
              size="xs"
              loading={isInitializing}
              onClick={onInitializeSpace}
            >
              Spaceを作成して有効化
            </Button>
          </Group>
        </Stack>
      </Alert>
    );
  }

  return null;
}
