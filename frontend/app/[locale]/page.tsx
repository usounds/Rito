import { Article } from '@/components/bookmarkcard/Article';
import { enrichBookmarks, withTrailingSlashVariants } from '@/logic/HandleBookmark';
import { stripTrackingParams } from '@/logic/stripTrackingParams';
import { prisma } from '@/logic/HandlePrismaClient';
import { Alert, Container, SimpleGrid } from '@mantine/core';
import { Heart, Clock, Info } from 'lucide-react';
import { getTranslations } from "next-intl/server";
import DiscoverTabs from './bookmark/discover/DiscoverTabs';
import DiscoverContentWrapper from './bookmark/discover/DiscoverContentWrapper';
import { Suspense } from 'react';
import DiscoverSkeleton from './bookmark/discover/DiscoverSkeleton';
import DiscoverFeed from './bookmark/discover/DiscoverFeed';
import classes from './bookmark/discover/Discover.module.scss';
import { Bookmark, Comment } from '@/type/ApiTypes';
import { getBaseUrl, getDefaultOgImage, getPublicPageAlternates } from '@/seo/publicPages';

export const dynamic = 'force-dynamic';

type DiscoverProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};


export async function generateMetadata({
  params,
  searchParams,
}: DiscoverProps) {
  const { locale } = await params;
  const { category } = await searchParams;
  const t = await getTranslations({ locale });

  const currentCategory = category || 'discover';

  if (currentCategory === 'discover') {
    return {
      title: t('title'),
      description: t('ogp.description'),
      alternates: getPublicPageAlternates(locale, ''),
    };
  }

  const categoryName = t(`category.${currentCategory}` as unknown as Parameters<typeof t>[0]);
  const baseUrl = getBaseUrl();
  const ogImage = getDefaultOgImage(baseUrl);

  return {
    title: `${categoryName} | ${t('title')}`,
    description: t('discover.ogpDescription', { 0: categoryName as string }),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
    },
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title: `${categoryName} | ${t('title')}`,
      description: t('discover.ogpDescription', { 0: categoryName }),
      images: [
        {
          ...ogImage,
          alt: t("ogp.title"),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${categoryName} | ${t('title')}`,
      description: t('discover.ogpDescription', { 0: categoryName as string }),
      images: [ogImage.url],
    },
  };
}

export default async function HomePage({ params, searchParams }: DiscoverProps) {
  const { locale } = await params;
  const { category } = await searchParams;
  const t = await getTranslations({ locale });

  const currentCategory = category || 'discover';

  let bookmarksContent;

  if (currentCategory === 'discover') {
    // DIDごとの最新取得
    const latestPerDid = await prisma.bookmark.groupBy({
      by: ['did'],
      _max: {
        created_at: true,
      },
    });

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        OR: latestPerDid.map((r: { did: string; _max: { created_at: Date | null } }) => ({
          did: r.did,
          created_at: r._max.created_at as Date,
        })),
        // generalカテゴリーの場合は、categoryがnullのもの（未分類）も表示する
        // ...(currentCategory === 'general' ? {
        //   OR: [
        //     { category: 'general' },
        //     { category: null }
        //   ]
        // } : {})
      },
      orderBy: [
        { created_at: 'desc' }, // 全体として最新順
        { did: 'asc' },
        { uri: 'desc' },        // 同時刻対策（決定的）
      ],
      take: 12,                // ← 最新12件
      include: {
        comments: true,
        tags: { include: { tag: true } },
      },
    });

    const bookmarksWithLikes = await enrichBookmarks(bookmarks, prisma);

    // いいね情報取得
    // 1. Like を新しい順で取得
    const likes = await prisma.like.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
      select: {
        subject: true,
        created_at: true,
      },
    });

    // 2. Like.subject から検索用 subject 一覧を作る
    const subjectVariants = new Set<string>();

    likes.forEach((like: { subject: string; created_at: Date }) => {
      if (like.subject.startsWith('http')) {
        withTrailingSlashVariants(like.subject).forEach((v: string) =>
          subjectVariants.add(v),
        );
      } else {
        // AT-URI
        subjectVariants.add(like.subject);
      }
    });

    const subjects = Array.from(subjectVariants);

    // 3. Bookmark を取得（ここで必ずヒットする）
    const likedBookmarks = await prisma.bookmark.findMany({
      where: {
        OR: [
          { uri: { in: subjects } },     // AT-URI Like
          { subject: { in: subjects } }, // URL Like
        ],
      },
      include: {
        comments: true,
        tags: { include: { tag: true } },
      },
    });

    // 4. subject(URL/URI) → Bookmark.uri の対応表
    const subjectToUri = new Map<string, string>();

    likedBookmarks.forEach((b) => {
      // AT-URI
      subjectToUri.set(b.uri, b.uri);

      // URL（/あり・なし）
      if (b.subject) {
        withTrailingSlashVariants(b.subject).forEach((v: string) => {
          subjectToUri.set(v, b.uri);
        });
      }
    });

    // 5. Like の順番を保持して Bookmark を 3 件に確定
    const orderedBookmarks: typeof likedBookmarks = [];
    const seenUris = new Set<string>();

    for (const like of likes) {
      const variants = like.subject.startsWith('http')
        ? withTrailingSlashVariants(like.subject)
        : [like.subject];

      for (const v of variants) {
        const uri = subjectToUri.get(v);
        if (!uri || seenUris.has(uri)) continue;

        const bookmark = likedBookmarks.find((b) => b.uri === uri);
        if (!bookmark) continue;

        orderedBookmarks.push(bookmark);
        seenUris.add(uri);

        if (orderedBookmarks.length === 3) break;
      }

      if (orderedBookmarks.length === 3) break;
    }

    // 6. enrich
    const latestLikedBookmarks = await enrichBookmarks(orderedBookmarks, prisma);

    bookmarksContent = (
      <>
        {/* いいねセクション */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', color: 'white'
          }}>
            <Heart size={16} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {t('discover.latestLike')}
          </span>
          <div className={classes.sectionDivider} />
        </div>
        <div className={classes.articleGrid}>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm" verticalSpacing="sm">
            {latestLikedBookmarks.map((b, index) => renderArticle(b, locale, index < 2))}
          </SimpleGrid>
        </div>

        {/* 最新ブックマークセクション */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, marginBottom: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #4facfe, #00f2fe)', color: 'white'
          }}>
            <Clock size={16} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {t('discover.latestbookmarbyusers')}
          </span>
          <div className={classes.sectionDivider} />
        </div>
        <div className={classes.articleGrid}>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm" verticalSpacing="sm">
            {bookmarksWithLikes.map((b, index) => renderArticle(b, locale, index < 2))}
          </SimpleGrid>
        </div>
      </>
    );
  } else {
    // Category filtered
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        OR: currentCategory === 'general' ? [
          { category: 'general' },
          { category: null }
        ] : [
          { category: currentCategory }
        ]
      },
      orderBy: { created_at: 'desc' },
      take: 50, // Match fetchCategoryBookmarks TAKE constant
      include: {
        comments: true,
        tags: { include: { tag: true } },
      },
    });

    // Enrich first to get commentCount (bookmark count)
    const enrichedBookmarks = await enrichBookmarks(bookmarks, prisma);

    // Deduplicate by URL (subject)
    // Deduplicate by URL (subject) and merge tags
    const uniqueBookmarksMap = new Map<string, (typeof enrichedBookmarks)[0]>();

    for (const b of enrichedBookmarks) {
      const normalizedSubject = stripTrackingParams(
        b.subject.endsWith('/') ? b.subject.slice(0, -1) : b.subject
      );

      if (uniqueBookmarksMap.has(normalizedSubject)) {
        // Merge tags
        const existing = uniqueBookmarksMap.get(normalizedSubject)!;
        const existingTags = new Set(existing.tags);
        b.tags.forEach((t: string) => existingTags.add(t));
        existing.tags = Array.from(existingTags).sort((a) => (a === 'Verified' ? -1 : 0));
      } else {
        uniqueBookmarksMap.set(normalizedSubject, b);
      }
    }

    const uniqueBookmarks = Array.from(uniqueBookmarksMap.values());

    bookmarksContent = (
      <DiscoverFeed
        initialBookmarks={uniqueBookmarks}
        category={currentCategory}
        locale={locale}
      />
    );
  }

  const baseUrl = getBaseUrl();
  const siteUrl = `${baseUrl}/${locale}`;
  const logoUrl = getDefaultOgImage(baseUrl).url;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Rito",
      "url": siteUrl,
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `${baseUrl}/${locale}/bookmark/search?tag={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Rito",
      "url": baseUrl,
      "logo": logoUrl,
      "sameAs": [
        "https://github.com/usounds/Rito"
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Rito",
      "url": siteUrl,
      "applicationCategory": "SocialNetworkingApplication",
      "operatingSystem": "Web",
      "description": t("description"),
      "image": logoUrl,
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
  ];

  return (
    <Container size="md" mx="auto" >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DiscoverTabs activeTab={currentCategory} />

      <DiscoverContentWrapper currentCategory={currentCategory}>
        <Suspense key={currentCategory} fallback={<DiscoverSkeleton />}>
          {bookmarksContent}
        </Suspense>
      </DiscoverContentWrapper>

      <Alert
        my="sm"
        variant="light"
        color="blue"
        title={t('inform.1minutes')}
        icon={<Info size={18} />}
        radius="lg"
        styles={{
          root: {
            border: '1px solid var(--mantine-color-blue-2)',
          }
         }}
      />

    </Container>
  );
}

function renderArticle(b: Bookmark, locale: string, priority: boolean = false) {
  // コメント優先フラグが true の場合は locale に対応したコメントを優先表示
  const comment =
    b.comments?.find((c: Comment) => c.lang === locale) ||
    b.comments?.[0] || { title: '', comment: '', moderations: [] };

  const displayTitle = comment.title || '';
  const displayComment = comment.comment || '';

  const useComment = true

  const moderationList: string[] = useComment
    ? [
      ...(comment.moderations || []),
      ...((!comment.title || !comment.comment) ? (b.moderations || []) : []),
    ]
    : [
      ...(b.moderations || []),
      ...((!b.ogpTitle || !b.ogpDescription) ? (comment.moderations || []) : []),
    ];

  const dateField = 'createdAt';
  const displayDate = new Date(b[dateField]);

  // b.commentCount comes from enrichBookmarks
  const bookmarkCount = b.commentCount || 0;

  return (
    <div key={b.uri} className={classes.articleItem}>
      <Article
        url={b.subject}
        title={displayTitle}
        handle={b.handle}
        comment={displayComment || ''}
        tags={b.tags}
        image={b.ogpImage}
        date={displayDate}
        moderations={moderationList}
        likes={b.likes || []}
        bookmarkCount={bookmarkCount}
        priority={priority}
      />
    </div>
  );
}
