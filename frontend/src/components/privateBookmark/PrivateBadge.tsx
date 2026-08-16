"use client";
import { Badge, Group } from '@mantine/core';
import { Lock } from 'lucide-react';

interface PrivateBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function PrivateBadge({ size = 'sm' }: PrivateBadgeProps) {
  return (
    <Badge
      variant="filled"
      color="violet"
      size={size}
      leftSection={<Lock size={size === 'xs' ? 10 : 12} />}
      styles={{
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      }}
    >
      Private
    </Badge>
  );
}
