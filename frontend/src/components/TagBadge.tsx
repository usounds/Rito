import React from 'react';
import { Group, Badge } from '@mantine/core';
import { BadgeCheck } from 'lucide-react';

interface TagBadgeProps {
  tags: string[];
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tags }) => {
  if (tags.length === 0) return null;

  return (
    <Group mb="xs" gap={3}>
      {tags.map((tag, idx) => (
        <Badge
          key={idx}
          variant="light"
          color={tag === 'Verified' ? 'orange' : 'blue'}
          styles={{ root: { textTransform: 'none' } }}
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
        </Badge>
      ))}
    </Group>
  );
};
