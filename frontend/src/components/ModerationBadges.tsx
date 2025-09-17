import { Badge } from '@mantine/core';
import { useTranslations } from 'next-intl';

interface ModerationBadgesProps {
  moderations: string[];
}

export const ModerationBadges: React.FC<ModerationBadgesProps> = ({ moderations }) => {
  const t = useTranslations('moderations'); // messages.message に対応

  return (
    <>
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
    </>
  );
};
