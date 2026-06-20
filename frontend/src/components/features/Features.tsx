import { Button, Container, Group, List, ListItem, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { ArrowRight, AtSign, Bookmark, Database, FileText, Grid3X3, Link2, MessageSquare, Sparkles, Star, Tags } from 'lucide-react';
import { Compass } from 'lucide-react';
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import classes from './Features.module.scss';
import { BookmarkCheck } from 'lucide-react';
import { FaChrome, FaFirefoxBrowser } from "react-icons/fa6";

interface FeaturesGridProps {
  t: Awaited<ReturnType<typeof getTranslations>>;
  locale: string; // 👈 追加
}

interface FeatureProps {
  icon: React.ElementType;
  title: React.ReactNode;
  description: React.ReactNode;
  href?: string
}

export function getFeatureItems(t: Awaited<ReturnType<typeof getTranslations>>, locale: string) {
  return [
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
      href: 'https://blog.usounds.work/posts/rito-for-developer',
      description: t('header.feature.ownerbenefit.longdescription'),
    },
    {
      icon: FaChrome,
      title: t('header.feature.chrome.title'),
      href: 'https://chromewebstore.google.com/detail/blfdajpbkfgdoecglhkbdbaafbgikmph',
      description: t('header.feature.chrome.longdescription'),
    },
    {
      icon: FaFirefoxBrowser,
      title: t('header.feature.firefox.title'),
      href: locale === 'ja'
        ? 'https://addons.mozilla.org/ja/firefox/addon/rito-extension/'
        : 'https://addons.mozilla.org/en-US/firefox/addon/rito-extension/',
      description: t('header.feature.firefox.longdescription'),
    },
    {
      icon: Star,
      title: t('header.feature.bookmarklet.title'),
      href: t('header.feature.bookmarklet.href'),
      description: t('header.feature.bookmarklet.longdescription'),
    },
  ];
}

export function Features({ icon: Icon, title, description, href }: FeatureProps) {

  return (
    <div>
      <ThemeIcon variant="light" size={40} radius={40}>
        <Icon size={18} strokeWidth={1.5} /> {/* 👈 strokeWidth に修正 */}
      </ThemeIcon>
      {href ? (
        <>
          <Link href={`${href}`} style={{ textDecoration: 'none', color: 'inherit', }}>
            <Text mt="sm" mb={7} style={{ display: 'block' }} >
              {title}
            </Text>
          </Link>
          <Link href={`${href}`} style={{ textDecoration: 'none' }}>
            <Text size="sm" style={{ color: 'light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-2))' }} lh={1.6}>
              {description}
            </Text>

          </Link>
        </>
      ) :
        <>
          <Text mt="sm" mb={7} style={{ display: 'block' }} >
            {title}
          </Text>

          <Text size="sm" style={{ color: 'light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-2))' }} lh={1.6}>
            {description}
          </Text>
        </>
      }
    </div>
  );
}

export function FeaturesGrid({ t, locale }: FeaturesGridProps) {

  const workflowItems = [
    { key: 'save', icon: Link2 },
    { key: 'organize', icon: Tags },
    { key: 'discover', icon: Compass },
    { key: 'access', icon: BookmarkCheck },
  ] as const;

  const categoryKeys = ['general', 'social', 'technology', 'lifestyle', 'food', 'travel', 'entertainment', 'anime_game', 'atprotocol', 'photo'] as const;

  const features = getFeatureItems(t, locale).map((feature, index) => (
    <div className={classes.featureItem} key={index}>
      <Features {...feature} />
    </div>
  ));

  return (
    <Container className={classes.wrapper}>
      <section className={classes.hero}>
        <div className={classes.heroGlow} />
        <div className={classes.heroContent}>
          <div className={classes.eyebrow}><Sparkles size={14} /> Rito / atproto</div>
          <Title className={classes.title}>{t('title')}</Title>
          <Text className={classes.description}>{t('aboutDetails.intro')}</Text>
          <Group gap="sm" mt="xl">
          <Link href={`/${locale}/my/bookmark`} style={{ textDecoration: 'none' }}>
            <Button
              leftSection={<BookmarkCheck size={16} />}
              rightSection={<ArrowRight size={15} />}
              className={classes.primaryAction}
            >
              {t('button.start')}
            </Button>
          </Link>

          <Link href={`/${locale}/`} style={{ textDecoration: 'none' }}>
            <Button
              leftSection={<Compass size={14} />}
              variant="subtle"
            >
              {t('button.discover')}
            </Button>
          </Link>
          </Group>
        </div>

        <div className={classes.heroVisual} aria-hidden="true">
          <div className={classes.browserBar}>
            <span /><span /><span />
            <div>rito.blue</div>
          </div>
          <div className={classes.previewBody}>
            <div className={classes.previewImage}><Bookmark size={32} /></div>
            <div className={classes.previewCopy}>
              <div className={classes.previewLabel}>{t('aboutDetails.workflow.save.title')}</div>
              <div className={classes.previewLine} />
              <div className={classes.previewLineShort} />
              <div className={classes.previewTags}>
                <span>{t('category.technology')}</span>
                <span>atproto</span>
              </div>
            </div>
          </div>
          <div className={classes.floatingNote}><MessageSquare size={15} /> + comment</div>
        </div>
      </section>

      <Stack mt={60} gap="xl">
        <section>
          <div className={classes.sectionHeading}>
            <span className={classes.sectionNumber}>01</span>
            <div>
              <Title order={2} className={classes.sectionTitle}>{t('aboutDetails.workflow.title')}</Title>
              <Text className={classes.sectionLead}>{t('aboutDetails.workflow.description')}</Text>
            </div>
          </div>
          <SimpleGrid mt="xl" cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {workflowItems.map(({ key, icon: Icon }, index) => (
              <div className={classes.workflowItem} key={key}>
                <div className={classes.stepTop}>
                  <ThemeIcon className={classes.stepIcon} size={44} radius="md"><Icon size={20} /></ThemeIcon>
                  <span>0{index + 1}</span>
                </div>
                <Text fw={600} mt="lg">{t(`aboutDetails.workflow.${key}.title`)}</Text>
                <Text size="sm" mt="xs" lh={1.7}>{t(`aboutDetails.workflow.${key}.description`)}</Text>
              </div>
            ))}
          </SimpleGrid>
        </section>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" className={classes.spotlightGrid}>
          <div className={`${classes.detailItem} ${classes.categoryCard}`}>
            <div className={classes.cardIcon}><Sparkles size={21} /></div>
            <Title order={2} className={classes.cardTitle}>{t('aboutDetails.categories.title')}</Title>
            <Text mt="sm" lh={1.75}>{t('aboutDetails.categories.description')}</Text>
            <div className={classes.categoryCloud}>
              {categoryKeys.map((key, index) => <span key={key} data-tone={index % 5}>{t(`category.${key}`)}</span>)}
            </div>
            <List size="sm" mt="md" spacing="xs" withPadding>
              <ListItem>{t('aboutDetails.categories.input')}</ListItem>
              <ListItem>{t('aboutDetails.categories.result')}</ListItem>
              <ListItem>{t('aboutDetails.categories.reason')}</ListItem>
            </List>
          </div>

          <div className={`${classes.detailItem} ${classes.appsCard}`}>
            <div className={classes.cardIcon}><Grid3X3 size={21} /></div>
            <Title order={2} className={classes.cardTitle}>{t('aboutDetails.myApps.title')}</Title>
            <Text mt="sm" lh={1.75}>{t('aboutDetails.myApps.description')}</Text>
            <div className={classes.collectionPreview} aria-hidden="true">
              {['app.bsky.feed', 'blue.rito.feed', 'uk.skyblur.post'].map((nsid, index) => (
                <div key={nsid}>
                  <span className={classes.appMark} data-tone={index}><Database size={15} /></span>
                  <code>{nsid}</code>
                  <ArrowRight size={14} />
                </div>
              ))}
            </div>
            <List size="sm" mt="md" spacing="xs" withPadding>
              <ListItem>{t('aboutDetails.myApps.collections')}</ListItem>
              <ListItem>{t('aboutDetails.myApps.catalog')}</ListItem>
              <ListItem>{t('aboutDetails.myApps.boundary')}</ListItem>
            </List>
            <Link href={`/${locale}/my/app`} style={{ textDecoration: 'none' }}>
              <Button mt="lg" variant="light">{t('aboutDetails.myApps.action')}</Button>
            </Link>
          </div>
        </SimpleGrid>

        <div className={`${classes.detailItem} ${classes.dataCard}`}>
          <div className={classes.dataIcon}><Database size={24} /></div>
          <div>
          <Title order={2} className={classes.cardTitle}>{t('aboutDetails.data.title')}</Title>
          <Text size="sm" mt="sm" lh={1.7}>{t('aboutDetails.data.description')}</Text>
          </div>
        </div>
      </Stack>

      <div className={classes.sectionHeading} style={{ marginTop: 72 }}>
        <span className={classes.sectionNumber}>02</span>
        <Title order={2} className={classes.sectionTitle}>{t('header.feature.title')}</Title>
      </div>
      <SimpleGrid
        mt="xl"
        cols={{ base: 1, sm: 2, md: 3 }}
        spacing={{ base: 'xl', md: 50 }}
        verticalSpacing={{ base: 'xl', md: 50 }}
      >
        {features}
      </SimpleGrid>
    </Container>
  );
}
