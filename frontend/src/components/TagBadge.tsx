import React from 'react';
import { Group, Badge } from '@mantine/core';
import { BadgeCheck } from 'lucide-react';
import Link from 'next/link';

interface TagBadgeProps {
  tags: string[];
  locale: string; // 追加
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tags, locale }) => {
  if (tags.length === 0) return null;

  return (
    <Group gap={3}>
      {tags.map((tag, idx) => (
        <Badge
          key={idx}
          variant="light"
          color={tag === 'Verified' ? 'orange' : 'blue'}
          styles={{ root: { textTransform: 'none' } }}
        >
          <Link href={`/${locale}/bookmark/search?tag=${encodeURIComponent(tag || '')}`} style={{ textDecoration: 'none', color: 'inherit' }}>
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
