import { Article } from '@/components/bookmarkcard/Article';
import { prisma } from '@/logic/HandlePrismaClient';
import { SimpleGrid, Stack } from '@mantine/core';
import { normalizeBookmarks, Bookmark } from '@/type/ApiTypes';
import PaginationWrapper from './PaginationWrapper';
import { Prisma } from "@prisma/client";

type PageProps = {
  params: { locale: string };
  searchParams?: {
    sort?: 'created' | 'updated';
    tag?: string[];
    handle?: string[];
    page?: string;
    comment?: string; // コメント優先フラグ
  };
};

export async function LatestBookmark({ params, searchParams }: PageProps) {
  const locale = params.locale;
  const query = searchParams ?? {};
  const useComment = query.comment == null || query.comment === 'comment';

  const page = query.page ? parseInt(query.page) : 1;
  const take = 12;
  const skip = (page - 1) * take;
  const orderField = query.sort === 'updated' ? 'indexed_at' : 'created_at';
// --- Prisma where 条件 ---
const where: Prisma.BookmarkWhereInput = {
  NOT: [{ subject: '' }],
};

if (query.handle?.length) {
  const includeHandles = query.handle.filter((h) => !h.startsWith('-'));
  const excludeHandles = query.handle.filter((h) => h.startsWith('-')).map((h) => h.slice(1));

  if (includeHandles.length) {
    where.handle = { in: includeHandles };
  }
  if (excludeHandles.length) {
    (where.NOT as Prisma.BookmarkWhereInput[]).push({
      handle: { in: excludeHandles },
    });
  }
}

if (query.tag?.length) {
  const includeTags = query.tag.filter((t) => !t.startsWith('-'));
  const excludeTags = query.tag.filter((t) => t.startsWith('-')).map((t) => t.slice(1));

  const andConditions: Prisma.BookmarkWhereInput[] = [];

  if (includeTags.length) {
    andConditions.push(
      ...includeTags.map((t) => ({
        tags: {
          some: {
            tag: {
              name: { equals: t, mode: 'insensitive' as const },
            },
          },
        },
      })),
    );
  }

  if (excludeTags.length) {
    (where.NOT as Prisma.BookmarkWhereInput[]).push(
      ...excludeTags.map((t) => ({
        tags: {
          some: {
            tag: {
              name: { equals: t, mode: 'insensitive' as const },
            },
          },
        },
      })),
    );
  }

  if (andConditions.length) {
    where.AND = andConditions;
  }
}

const bookmarks = await prisma.bookmark.findMany({
  where,
  orderBy: { [orderField]: 'desc' },
  take,
  skip,
  include: {
    comments: true,
    tags: { include: { tag: true } },
  },
});


  const totalCount = await prisma.bookmark.count({ where });
  const totalPages = Math.ceil(totalCount / take);

  function withTrailingSlashVariants(uri: string) {
    return uri.endsWith("/")
      ? [uri, uri.slice(0, -1)]
      : [uri, uri + "/"];
  }

  const normalized: Bookmark[] = normalizeBookmarks(bookmarks);


  // 1. normalized の Bookmark.subject の末尾スラッシュ有無バリエーションを作成
  const subjectVariants = normalized.flatMap(b => withTrailingSlashVariants(b.subject))

  // 2. Bookmark テーブルから URL を検索（両方のバリエーションを targets に渡す）
  const bookmarksFromDb: { uri: string; subject: string }[] = await prisma.bookmark.findMany({
    where: { subject: { in: subjectVariants } },
    select: { uri: true, subject: true },
  });
  const subjectCountMap: Record<string, number> = {};
  bookmarksFromDb.forEach(b => {
    if (!subjectCountMap[b.subject]) subjectCountMap[b.subject] = 0;
    subjectCountMap[b.subject]++;
  });

  // 3. URL ↔ Bookmark.uri マッピング（末尾スラッシュあり・なし両方をキーに）
  const urlToUriMap: Record<string, string> = {};
  bookmarksFromDb.forEach(b => {
    const variants = withTrailingSlashVariants(b.subject);
    variants.forEach(v => {
      urlToUriMap[v] = b.uri;
    });
  });

  // 4. Likes を検索（targets は URL バリエーション + Bookmark.uri）
  const targets = [
    ...Object.keys(urlToUriMap),      // URLバリエーション
    ...bookmarksFromDb.map(b => b.uri)     // Bookmark URI
  ];
  const likes: { subject: string; aturi: string }[] = await prisma.like.findMany({
    where: { subject: { in: targets } },
    select: { subject: true, aturi: true },
  });

  // URL ↔ Bookmark.uri マッピング（複数 URI 対応、末尾スラッシュ有無両方）
  const urlToUrisMap: Record<string, string[]> = {};
  bookmarksFromDb.forEach(b => {
    const variants = withTrailingSlashVariants(b.subject);
    variants.forEach(v => {
      if (!urlToUrisMap[v]) urlToUrisMap[v] = [];
      urlToUrisMap[v].push(b.uri);
    });
  });

  // Bookmark.uri ごとに Like を集計
  const uriLikesMap: Record<string, string[]> = {};
  likes.forEach(like => {
    const matchedUris: string[] = [];

    if (like.subject.startsWith('http')) {
      // URL Like の場合
      const variants = withTrailingSlashVariants(like.subject);
      variants.forEach(v => {
        const uris = urlToUrisMap[v];
        if (uris) matchedUris.push(...uris);
      });
    } else {
      // AT URI Like の場合、Bookmark.uri に直接マッピング
      // ただし、その URI が urlToUrisMap の value に含まれている Bookmark.uri なら URL Like と同じ場所に集約
      Object.values(urlToUrisMap).forEach(uris => {
        if (uris.includes(like.subject)) matchedUris.push(...uris);
      });
      // 上記にマッチしなかった場合はそのまま push
      if (matchedUris.length === 0) matchedUris.push(like.subject);
    }

    const uniqueUris = Array.from(new Set(matchedUris));
    uniqueUris.forEach(uri => {
      if (!uriLikesMap[uri]) uriLikesMap[uri] = [];
      uriLikesMap[uri].push(like.aturi);
    });
  });
  // normalized に likes をマージ
  const bookmarksWithLikes = normalized.map(bookmark => {
    const variants = withTrailingSlashVariants(bookmark.subject);
    // variants の合計件数を取得
    const count = variants.reduce((acc, v) => acc + (subjectCountMap[v] || 0), 0);

    return {
      ...bookmark,
      likes: [...new Set(uriLikesMap[bookmark.uri] || [])],
      commentCount: count,
    };
  });

  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {bookmarksWithLikes.map((b) => {
          // コメント優先フラグが true の場合は locale に対応したコメントを優先表示
          const comment =
            b.comments?.find((c) => c.lang === locale) ||
            b.comments?.[0] || { title: '', comment: '', moderations: [] };

          const displayTitle = useComment ? comment.title : b.ogpTitle || comment.title || '';
          const displayComment = useComment ? comment.comment || b.ogpDescription : b.ogpDescription || comment.comment || '';

          const moderationList: string[] = useComment
            ? [
              ...(comment.moderations || []),
              ...((!comment.title || !comment.comment) ? (b.moderations || []) : []),
            ]
            : [
              ...(b.moderations || []),
              ...((!b.ogpTitle || !b.ogpDescription) ? (comment.moderations || []) : []),
            ];

          const dateField: 'createdAt' | 'indexedAt' = query.sort === 'updated' ? 'indexedAt' : 'createdAt';
          const displayDate = new Date(b[dateField]);

          return (
            <div key={b.uri} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Article
                url={b.subject}
                title={displayTitle}
                handle={b.handle}
                comment={displayComment || ''}
                tags={b.tags}
                image={b.ogpImage }
                date={displayDate}
                moderations={moderationList}
                key={new Date().getTime().toString()}
                likes={b.likes || []}
              />
            </div>
          );
        })}
      </SimpleGrid>
      <PaginationWrapper total={totalPages} page={page} query={query} />
    </Stack>
  );
}
