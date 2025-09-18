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

  return (
    <Group my='xs'>
      {moderations.map((mod) => (
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
