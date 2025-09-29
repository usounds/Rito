import React from 'react';
import { Group, Badge } from '@mantine/core';
import { BadgeCheck } from 'lucide-react';
import Link from 'next/link';

interface TagBadgeProps {
  tags: string[];
  locale: string; // 追加
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tags, locale }) => {
  const uniqueTags = Array.from(new Set(tags)); // 重複削除

  if (uniqueTags.length === 0) return null;

  const sortedTags = uniqueTags.sort((a, b) => {
    if (a === 'Verified') return -1;
    if (b === 'Verified') return 1;
    return a.localeCompare(b);
  });

  return (
    <Group gap={3}>
      {sortedTags.map((tag, idx) => (
        <Badge
          key={idx}
          variant="light"
          color={tag === 'Verified' ? 'orange' : 'blue'}
          styles={{ root: { textTransform: 'none' } }}
        >
          <Link
            href={`/${locale}/bookmark/search?tag=${encodeURIComponent(tag || '')}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
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
