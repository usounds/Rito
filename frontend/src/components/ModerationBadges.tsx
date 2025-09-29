import { Badge, Group } from '@mantine/core';
import { useTranslations } from 'next-intl';

interface ModerationBadgesProps {
  moderations: string[];
}

export const ModerationBadges: React.FC<ModerationBadgesProps> = ({ moderations }) => {
  const t = useTranslations('moderations');

  if (!moderations || moderations.length === 0) {
    return null;
  }

  const uniqueModerations = Array.from(new Set(moderations)); // 重複削除

  return (
    <Group mb="xs" gap={3}>
      {uniqueModerations.map((mod) => (
        <Badge
          key={mod}
          color="gray"
          variant="outline"
          styles={{ root: { textTransform: 'none' } }}
        >
          {t(mod)}
        </Badge>
      ))}
    </Group>
  );
};
