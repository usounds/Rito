"use client"
import React, { useState, useEffect } from 'react';
import { Group, Badge } from '@mantine/core';
import { BadgeCheck } from 'lucide-react';
import Link from 'next/link';

interface TagBadgeProps {
  tags: string[];
  locale: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tags, locale }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsClient(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // クライアントサイドでのみ描画する（ハイドレーションエラー防止）
  if (!isClient) {
    return null;
  }

  const uniqueTags = Array.from(new Set(tags));
  if (uniqueTags.length === 0) return null;

  const sortedTags = [...uniqueTags].sort((a, b) => {
    if (a === 'Verified') return -1;
    if (b === 'Verified') return 1;
    return a.localeCompare(b);
  });

  return (
    <Group gap={3} data-testid="tag-badge-group">
      {sortedTags.map((tag, idx) => (
        <Badge
          key={`${tag}-${idx}`}
          variant="light"
          color={tag === 'Verified' ? 'orange' : 'blue'}
          styles={{ root: { textTransform: 'none', height: '24px', padding: 0 } }}
        >
          <Link
            href={`/${locale}/bookmark/search?tag=${encodeURIComponent(tag || '')}`}
            style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', height: '100%', padding: '0 8px' }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tag === 'Verified' ? 2 : 0,
              }}
            >
              {tag === 'Verified' && <BadgeCheck size={12} />}
              {tag}
            </span>
          </Link>
        </Badge>
      ))}
    </Group>
  );
};
