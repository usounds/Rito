import { Article } from '@/components/bookmarkcard/Article';
import Breadcrumbs from "@/components/Breadcrumbs";
import { enrichBookmarks, withTrailingSlashVariants } from '@/logic/HandleBookmark';
import { prisma } from '@/logic/HandlePrismaClient';
import { Alert, Container, SimpleGrid, Text } from '@mantine/core';
import { Info } from 'lucide-react';
import { getTranslations } from "next-intl/server";

export const dynamic = 'force-dynamic';

type DiscoverProps = {
  params: Promise<{ locale: string }>;
};

export default async function DiscoverPage({ params }: DiscoverProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale });



  // DIDごとの最新取得
  const latestPerDid = await prisma.bookmark.groupBy({
    by: ['did'],
    _max: {
      created_at: true,
    },
  });

  const bookmarks = await prisma.bookmark.findMany({
    where: {
      OR: latestPerDid.map(r => ({
        did: r.did,
        created_at: r._max.created_at!,
      })),
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

  likes.forEach(like => {
    if (like.subject.startsWith('http')) {
      withTrailingSlashVariants(like.subject).forEach(v =>
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

  likedBookmarks.forEach(b => {
    // AT-URI
    subjectToUri.set(b.uri, b.uri);

    // URL（/あり・なし）
    if (b.subject) {
      withTrailingSlashVariants(b.subject).forEach(v => {
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

      const bookmark = likedBookmarks.find(b => b.uri === uri);
      if (!bookmark) continue;

      orderedBookmarks.push(bookmark);
      seenUris.add(uri);

      if (orderedBookmarks.length === 3) break;
    }

    if (orderedBookmarks.length === 3) break;
  }

  // 6. enrich
  const latestLikedBookmarks = await enrichBookmarks(orderedBookmarks, prisma);
  return (
    <Container size="md" mx="auto" >
      <Breadcrumbs items={[{ label: t('discover.title') }]} />

      <Text mt='sm' c="dimmed">{t('discover.latestLike')}</Text>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">

        {latestLikedBookmarks.map((b) => {

          // コメント優先フラグが true の場合は locale に対応したコメントを優先表示
          const comment =
            b.comments?.find((c) => c.lang === locale) ||
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
          return (
            <div key={b.uri} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Article
                url={b.subject}
                title={displayTitle}
                handle={b.handle}
                comment={displayComment || ''}
                tags={b.tags}
                image={b.ogpImage}
                date={displayDate}
                moderations={moderationList}
                key={new Date().getTime().toString()}
                likes={b.likes || []}
              />
            </div>
          );
        })}
      </SimpleGrid>

      <Text mt='sm' c="dimmed">{t('discover.latestbookmarbyusers')}</Text>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">

        {bookmarksWithLikes.map((b) => {

          // コメント優先フラグが true の場合は locale に対応したコメントを優先表示
          const comment =
            b.comments?.find((c) => c.lang === locale) ||
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
          return (
            <div key={b.uri} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Article
                url={b.subject}
                title={displayTitle}
                handle={b.handle}
                comment={displayComment || ''}
                tags={b.tags}
                image={b.ogpImage}
                date={displayDate}
                moderations={moderationList}
                key={new Date().getTime().toString()}
                likes={b.likes || []}
              />
            </div>
          );
        })}
      </SimpleGrid>

      <Alert my="sm" variant="light" color="blue" title={t('inform.1minutes')} icon={<Info size={18} />} />

    </Container>
  );
}