import { Button, Container, Group, SimpleGrid, Text, ThemeIcon, Title } from '@mantine/core';
import { AtSign, Bookmark, FileText, Search, SquareArrowOutUpRight } from 'lucide-react';
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import classes from './Features.module.scss';
import { BookmarkCheck } from 'lucide-react';

interface FeaturesGridProps {
  t: Awaited<ReturnType<typeof getTranslations>>;
  locale: string; // 👈 追加
}

interface FeatureProps {
  icon: React.ElementType;
  title: React.ReactNode;
  description: React.ReactNode;
}

export function Features({ icon: Icon, title, description }: FeatureProps) {

  return (
    <div>
      <ThemeIcon variant="light" size={40} radius={40}>
        <Icon size={18} strokeWidth={1.5} /> {/* 👈 strokeWidth に修正 */}
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

export function FeaturesGrid({ t, locale }: FeaturesGridProps) {

  const MOCKDATA = [
    {
      icon: Bookmark,
      title: t('header.feature.allbookmark.title'),
      description: t('header.feature.allbookmark.longdescription'),
    },
    {
      icon: AtSign,
      title: t('header.feature.atproto.title'),
      description: t('header.feature.atproto.longdescription'),
    },
    {
      icon: FileText,
      title: t('header.feature.ownerbenefit.title'),
      description: t('header.feature.ownerbenefit.longdescription'),
    },
  ];

  const features = MOCKDATA.map((feature, index) => (
    <Features {...feature} key={index} />
  ));

  return (
    <Container className={classes.wrapper}>
      <Title className={classes.title}>{t('title')}</Title>

      <Container size={560} p={0}>
        <Text size="sm" className={classes.description}>
          {t('description')}
        </Text>
        <Group justify="center" gap="md" mt="md">
          <Button
            component={Link}
            href={`/${locale}/my/bookmark`}
            leftSection={<BookmarkCheck size={14} />}
            variant="default"
          >
            {t('button.start')}
          </Button>
          <Button
            component={Link}
            href={`/${locale}/bookmark/search`}
            leftSection={<Search size={14}
            />} variant="default">
            {t('button.search')}
          </Button>
        </Group>
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
