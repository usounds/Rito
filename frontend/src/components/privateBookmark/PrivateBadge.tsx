"use client";
import { Badge } from '@mantine/core';
import { Lock } from 'lucide-react';
import { useMessages } from 'next-intl';

interface PrivateBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function PrivateBadge({ size = 'sm' }: PrivateBadgeProps) {
  const messages = useMessages() as any;

  return (
    <Badge
      variant="light"
      color="indigo"
      size={size}
      leftSection={<Lock size={size === 'xs' ? 10 : 12} />}
      styles={{
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      }}
    >
      {messages.privateBookmark?.badge || '自分のみ'}
    </Badge>
  );
}
