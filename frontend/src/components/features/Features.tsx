import { IconCookie, IconGauge, IconLock, IconMessage2, IconUser } from '@tabler/icons-react';
import { Container, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core';
import { getTranslations, setRequestLocale } from "next-intl/server";
import classes from './Features.module.scss';
import { CiAt, CiBookmark, CiFileOn } from "react-icons/ci";

interface FeaturesGridProps {
  t: Awaited<ReturnType<typeof getTranslations>>;
}


interface FeatureProps {
  icon: React.FC<any>;
  title: React.ReactNode;
  description: React.ReactNode;
}

export function Features({ icon: Icon, title, description }: FeatureProps) {
  return (
    <div>
      <ThemeIcon variant="light" size={40} radius={40}>
        <Icon size={18} stroke={1.5} />
      </ThemeIcon>
      <Text mt="sm" mb={7}>
        {title}
      </Text>
      <Text size="sm" c="dimmed" lh={1.6}>
        {description}
      </Text>
    </div>
  );
}

export function FeaturesGrid({ t }: FeaturesGridProps) {

  const MOCKDATA = [
        {
          icon: CiBookmark,
          title:t('header.feature.allbookmark.title'),
          description: t('header.feature.allbookmark.longdescription'),
        },
        {
          icon: CiAt,
          title:t('header.feature.atproto.title'),
          description: t('header.feature.atproto.longdescription'),
        },
        {
          icon: CiFileOn,
          title:t('header.feature.ownerbenefit.title'),
          description: t('header.feature.ownerbenefit.longdescription'),
        }
  ];
  const features = MOCKDATA.map((feature, index) => <Features {...feature} key={index} />);

  return (
    <Container className={classes.wrapper}>
      <Title className={classes.title}>{t('title')}</Title>

      <Container size={560} p={0}>
        <Text size="sm" className={classes.description}>
          {t('description')}
        </Text>
      </Container>

      <SimpleGrid
        mt={60}
        cols={{ base: 1, sm: 2, md: 3 }}
        spacing={{ base: 'xl', md: 50 }}
        verticalSpacing={{ base: 'xl', md: 50 }}
      >
        {features}
      </SimpleGrid>
    </Container>
  );
}