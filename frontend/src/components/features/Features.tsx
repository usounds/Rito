import { Button, Container, Group, List, ListItem, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { ArrowRight, AtSign, Bookmark, Database, FileText, Grid3X3, Link2, MessageSquare, ShieldCheck, Sparkles, Star, Tags } from 'lucide-react';
import { Compass } from 'lucide-react';
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import classes from './Features.module.scss';
import { BookmarkCheck } from 'lucide-react';
import { FaChrome, FaFirefoxBrowser } from "react-icons/fa6";

interface FeaturePageProps {
  t: Awaited<ReturnType<typeof getTranslations>>;
  locale: string;
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

export function AboutOverview({ t, locale }: FeaturePageProps) {
  return (
    <Container className={classes.wrapper}>
      <section className={classes.hero}>
        <div className={classes.heroGlow} />
        <div className={classes.heroContent}>
          <div className={classes.eyebrow}><Sparkles size={14} /> Rito / <span style={{ textTransform: 'lowercase' }}>atproto</span></div>
          <Title className={classes.title}>{t('aboutDetails.hero.title')}</Title>
          <Text className={classes.description}>{t('aboutDetails.intro')}</Text>
          <Group gap="sm" mt="xl">
            <Link href={`/${locale}/how-to-use`} style={{ textDecoration: 'none' }}>
              <Button
                leftSection={<BookmarkCheck size={16} />}
                rightSection={<ArrowRight size={15} />}
                className={classes.primaryAction}
              >
                {t('header.howToUse')}
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

        <div className={`${classes.heroVisual} ${classes.aboutHeroVisual}`} aria-hidden="true">
          <div className={classes.browserBar}>
            <span /><span /><span />
            <div>rito.blue</div>
          </div>
          <div className={classes.previewBody}>
            <div className={classes.previewImage}><Bookmark size={32} /></div>
            <div className={classes.previewCopy}>
              <div className={classes.previewLabel}>{t('aboutDetails.preview.title')}</div>
              <div className={classes.previewLine} />
              <div className={classes.previewLineShort} />
              <div className={classes.previewTags}>
                <span>{t('category.technology')}</span>
                <span>atproto</span>
              </div>
            </div>
          </div>
          <div className={classes.floatingNote}><MessageSquare size={15} /> + context</div>
        </div>
      </section>

      <Stack mt={60} gap="xl">
        <section>
          <div className={classes.sectionHeading}>
            <span className={classes.sectionNumber}>01</span>
            <div>
              <Title order={2} className={classes.sectionTitle}>{t('howToUseDetails.what.title')}</Title>
              <Text className={classes.sectionLead}>{t('howToUseDetails.what.description')}</Text>
            </div>
          </div>
          <SimpleGrid mt="xl" cols={{ base: 1, md: 2 }} spacing="md">
            <div className={classes.workflowItem}>
              <div className={classes.stepTop}>
                <ThemeIcon className={classes.stepIcon} size={44} radius="md"><AtSign size={20} /></ThemeIcon>
              </div>
              <Text fw={600} mt="lg">{t('howToUseDetails.what.accountTitle')}</Text>
              <Text size="sm" mt="xs" lh={1.7}>{t('howToUseDetails.what.accountDescription')}</Text>
            </div>
            <div className={classes.workflowItem}>
              <div className={classes.stepTop}>
                <ThemeIcon className={classes.stepIcon} size={44} radius="md"><BookmarkCheck size={20} /></ThemeIcon>
              </div>
              <Text fw={600} mt="lg">{t('howToUseDetails.what.shareTitle')}</Text>
              <Text size="sm" mt="xs" lh={1.7}>{t('howToUseDetails.what.shareDescription')}</Text>
            </div>
          </SimpleGrid>
        </section>

        <section>
          <div className={classes.sectionHeading}>
            <span className={classes.sectionNumber}>02</span>
            <div>
              <Title order={2} className={classes.sectionTitle}>{t('aboutDetails.data.title')}</Title>
              <Text className={classes.sectionLead}>{t('aboutDetails.data.description')}</Text>
            </div>
          </div>
          <SimpleGrid mt="xl" cols={{ base: 1, md: 3 }} spacing="md">
            <div className={classes.workflowItem}>
              <div className={classes.stepTop}>
                <ThemeIcon className={classes.stepIcon} size={44} radius="md"><Database size={20} /></ThemeIcon>
              </div>
              <Text fw={600} mt="lg">{t('howToUseDetails.data.pdsTitle')}</Text>
              <Text size="sm" mt="xs" lh={1.7}>{t('howToUseDetails.data.pdsDescription')}</Text>
            </div>
            <div className={classes.workflowItem}>
              <div className={classes.stepTop}>
                <ThemeIcon className={classes.stepIcon} size={44} radius="md"><ShieldCheck size={20} /></ThemeIcon>
              </div>
              <Text fw={600} mt="lg">{t('aboutDetails.data.oauthTitle')}</Text>
              <Text size="sm" mt="xs" lh={1.7}>{t('aboutDetails.data.oauthDescription')}</Text>
            </div>
            <div className={classes.workflowItem}>
              <div className={classes.stepTop}>
                <ThemeIcon className={classes.stepIcon} size={44} radius="md"><AtSign size={20} /></ThemeIcon>
              </div>
              <Text fw={600} mt="lg">{t('aboutDetails.data.controlTitle')}</Text>
              <Text size="sm" mt="xs" lh={1.7}>{t('aboutDetails.data.controlDescription')}</Text>
            </div>
          </SimpleGrid>
        </section>

        <section>
          <div className={classes.sectionHeading}>
            <span className={classes.sectionNumber}>03</span>
            <div>
              <Title order={2} className={classes.sectionTitle}>{t('aboutDetails.myApps.title')}</Title>
              <Text className={classes.sectionLead}>{t('aboutDetails.myApps.description')}</Text>
            </div>
          </div>
          <div className={`${classes.detailItem} ${classes.appsCard}`} style={{ marginTop: 28 }}>
            <div className={classes.cardIcon}><Grid3X3 size={21} /></div>
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
        </section>
      </Stack>
    </Container>
  );
}

export function HowToUseGuide({ t, locale }: FeaturePageProps) {
  const saveStepItems = [
    { key: 'save', icon: Link2 },
    { key: 'organize', icon: MessageSquare },
    { key: 'discover', icon: Tags },
  ] as const;

  const loginSteps = [1, 2, 3] as const;

  return (
    <Container className={classes.wrapper}>
      <section className={`${classes.hero} ${classes.articleHero}`}>
        <div className={classes.heroGlow} />
        <div className={classes.heroContent}>
          <div className={classes.eyebrow}><Sparkles size={14} /> Rito / <span style={{ textTransform: 'lowercase' }}>atproto</span></div>
          <Title className={classes.title}>{t('howToUseDetails.hero.title')}</Title>
          <Text className={classes.description}>{t('howToUseDetails.intro')}</Text>
        </div>
      </section>

      <Stack mt={60} gap="xl">
        <section>
          <div className={classes.sectionHeading}>
            <span className={classes.sectionNumber}>01</span>
            <div>
              <Title order={2} className={classes.sectionTitle}>{t('howToUseDetails.login.title')}</Title>
              <Text className={classes.sectionLead}>{t('howToUseDetails.login.description')}</Text>
            </div>
          </div>
          <SimpleGrid mt="xl" cols={{ base: 1, sm: 3 }} spacing="md">
            {loginSteps.map((step) => (
              <div className={classes.workflowItem} key={step}>
                <div className={classes.stepTop}>
                  <ThemeIcon className={classes.stepIcon} size={44} radius="md"><ShieldCheck size={20} /></ThemeIcon>
                  <span>0{step}</span>
                </div>
                <Text fw={600} mt="lg">{t(`howToUseDetails.login.step${step}.title`)}</Text>
                <Text size="sm" mt="xs" lh={1.7}>{t(`howToUseDetails.login.step${step}.description`)}</Text>
              </div>
            ))}
          </SimpleGrid>
        </section>

        <section>
          <div className={classes.sectionHeading}>
            <span className={classes.sectionNumber}>02</span>
            <div>
              <Title order={2} className={classes.sectionTitle}>{t('howToUseDetails.workflow.title')}</Title>
              <Text className={classes.sectionLead}>{t('howToUseDetails.workflow.description')}</Text>
            </div>
          </div>
          <SimpleGrid mt="xl" cols={{ base: 1, sm: 3 }} spacing="md">
            {saveStepItems.map(({ key, icon: Icon }, index) => (
              <div className={classes.workflowItem} key={key}>
                <div className={classes.stepTop}>
                  <ThemeIcon className={classes.stepIcon} size={44} radius="md"><Icon size={20} /></ThemeIcon>
                  <span>0{index + 1}</span>
                </div>
                <Text fw={600} mt="lg">{t(`howToUseDetails.workflow.${key}.title`)}</Text>
                <Text size="sm" mt="xs" lh={1.7}>{t(`howToUseDetails.workflow.${key}.description`)}</Text>
              </div>
            ))}
          </SimpleGrid>
        </section>

        <section>
          <div className={classes.sectionHeading}>
            <span className={classes.sectionNumber}>03</span>
            <div>
              <Title order={2} className={classes.sectionTitle}>{t('howToUseDetails.search.title')}</Title>
              <Text className={classes.sectionLead}>{t('howToUseDetails.search.description')}</Text>
            </div>
          </div>
          <Stack mt="xl" gap="md">
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" className={classes.spotlightGrid}>
              <div className={classes.detailItem}>
                <div className={classes.cardIcon}><Compass size={21} /></div>
                <Title order={2} className={classes.cardTitle}>{t('howToUseDetails.search.filterTitle')}</Title>
                <Text mt="sm" lh={1.75}>{t('howToUseDetails.search.filterDescription')}</Text>
              </div>

              <div className={classes.detailItem}>
                <div className={classes.cardIcon}><Sparkles size={21} /></div>
                <Title order={2} className={classes.cardTitle}>{t('howToUseDetails.categories.title')}</Title>
                <Text mt="sm" lh={1.75}>{t('howToUseDetails.categories.description')}</Text>
              </div>

              <div className={classes.detailItem}>
                <div className={classes.cardIcon}><Tags size={21} /></div>
                <Title order={2} className={classes.cardTitle}>{t('howToUseDetails.tags.title')}</Title>
                <Text mt="sm" lh={1.75}>{t('howToUseDetails.tags.description')}</Text>
              </div>
            </SimpleGrid>
          </Stack>
        </section>

        <section>
          <div className={classes.sectionHeading}>
            <span className={classes.sectionNumber}>04</span>
            <div>
              <Title order={2} className={classes.sectionTitle}>{t('howToUseDetails.browser.title')}</Title>
              <Text className={classes.sectionLead}>{t('howToUseDetails.browser.description')}</Text>
            </div>
          </div>
          <SimpleGrid mt="xl" cols={{ base: 1, md: 3 }} spacing="md">
            {[
              { key: 'chrome', icon: FaChrome },
              { key: 'firefox', icon: FaFirefoxBrowser },
              { key: 'bookmarklet', icon: Star },
            ].map(({ key, icon: Icon }) => (
              <div className={classes.workflowItem} key={key}>
                <div className={classes.stepTop}>
                  <ThemeIcon className={classes.stepIcon} size={44} radius="md"><Icon size={20} /></ThemeIcon>
                </div>
                <Text size="sm" mt="lg" lh={1.7}>{t(`howToUseDetails.browser.${key}`)}</Text>
              </div>
            ))}
          </SimpleGrid>
        </section>

        <section>
          <div className={classes.sectionHeading}>
            <span className={classes.sectionNumber}>05</span>
            <div>
              <Title order={2} className={classes.sectionTitle}>{t('howToUseDetails.sync.title')}</Title>
              <Text className={classes.sectionLead}>{t('howToUseDetails.sync.description')}</Text>
            </div>
          </div>
          <SimpleGrid mt="xl" cols={{ base: 1, md: 2 }} spacing="lg" className={classes.spotlightGrid}>
            <div className={`${classes.detailItem} ${classes.categoryCard}`}>
              <div className={classes.cardIcon}><Compass size={21} /></div>
              <Title order={2} className={classes.cardTitle}>{t('howToUseDetails.sync.shareTitle')}</Title>
              <Text mt="sm" lh={1.75}>{t('howToUseDetails.sync.shareDescription')}</Text>
            </div>
            <div className={`${classes.detailItem} ${classes.appsCard}`}>
              <div className={classes.cardIcon}><BookmarkCheck size={21} /></div>
              <Title order={2} className={classes.cardTitle}>{t('howToUseDetails.sync.saveTitle')}</Title>
              <Text mt="sm" lh={1.75}>{t('howToUseDetails.sync.saveDescription')}</Text>
            </div>
          </SimpleGrid>
        </section>

        <section>
          <div className={classes.sectionHeading}>
            <span className={classes.sectionNumber}>06</span>
            <div>
              <Title order={2} className={classes.sectionTitle}>{t('aboutDetails.myApps.title')}</Title>
              <Text className={classes.sectionLead}>{t('aboutDetails.myApps.description')}</Text>
            </div>
          </div>
          <div className={`${classes.detailItem} ${classes.appsCard}`} style={{ marginTop: 28 }}>
            <div className={classes.cardIcon}><Grid3X3 size={21} /></div>
            <List size="sm" spacing="xs" withPadding>
              <ListItem>{t('aboutDetails.myApps.collections')}</ListItem>
              <ListItem>{t('aboutDetails.myApps.catalog')}</ListItem>
              <ListItem>{t('aboutDetails.myApps.boundary')}</ListItem>
            </List>
          </div>
        </section>

        <section>
          <div className={classes.sectionHeading}>
            <span className={classes.sectionNumber}>07</span>
            <div>
              <Title order={2} className={classes.sectionTitle}>{t('howToUseDetails.start.title')}</Title>
              <Text className={classes.sectionLead}>{t('howToUseDetails.start.description')}</Text>
              <Link href={`/${locale}/my/bookmark`} style={{ textDecoration: 'none' }}>
                <Button
                  mt="lg"
                  leftSection={<BookmarkCheck size={16} />}
                  rightSection={<ArrowRight size={15} />}
                  className={classes.primaryAction}
                >
                  {t('button.start')}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </Stack>
    </Container>
  );
}
