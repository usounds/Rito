// Note : Include Prisma Client. Please use Server Components or APIs only. 
import { RawBookmark, Bookmark } from '@/type/ApiTypes'
import { PrismaClient } from '@prisma/client';


export function withTrailingSlashVariants(uri: string) {
  return uri.endsWith("/")
    ? [uri, uri.slice(0, -1)]
    : [uri, uri + "/"];
}


export function normalizeBookmarks(raw: RawBookmark[]): Bookmark[] {
  return raw.map(b => ({
    uri: b.uri,
    handle: b.handle ?? '',
    subject: b.subject,
    ogpTitle: b.ogp_title ?? '',
    ogpDescription: b.ogp_description ?? '',
    ogpImage: b.ogp_image ?? null,
    createdAt:
      typeof b.created_at === 'string'
        ? b.created_at
        : b.created_at.toISOString(),
    indexedAt:
      typeof b.indexed_at === 'string'
        ? b.indexed_at
        : b.indexed_at.toISOString(),
    moderations: b.moderation_result
      ? b.moderation_result.split(',').map(s => s.trim())
      : [],
    comments: b.comments.map(c => ({
      lang: c.lang === 'en' ? 'en' : 'ja',
      title: c.title ?? '',
      comment: c.comment ?? '',
      moderations: c.moderation_result
        ? c.moderation_result.split(',').map(s => s.trim())
        : [],
    })),
    tags: Array.isArray(b.tags)
      ? b.tags
        .map(t => t.tag.name)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .sort((a, _b) => (a === 'Verified' ? -1 : 0))
      : [],
    category: b.category ?? null,
  }));
}
export async function enrichBookmarks(
  bookmarks: RawBookmark[],
  prisma: PrismaClient,
): Promise<(Bookmark & { likes: string[]; commentCount: number })[]> {
  const normalized = normalizeBookmarks(bookmarks);

  // 1. subject の末尾スラッシュ有無バリエーション
  const subjectVariants = normalized.flatMap(b =>
    withTrailingSlashVariants(b.subject),
  );

  // 2. Bookmark テーブル検索
  const bookmarksFromDb = await prisma.bookmark.findMany({
    where: { subject: { in: subjectVariants } },
    select: { uri: true, subject: true },
  });

  // subject → 件数
  const subjectCountMap: Record<string, number> = {};
  bookmarksFromDb.forEach(b => {
    subjectCountMap[b.subject] = (subjectCountMap[b.subject] ?? 0) + 1;
  });

  // URL variant → URIs（複数対応）
  const urlToUrisMap: Record<string, string[]> = {};
  bookmarksFromDb.forEach(b => {
    withTrailingSlashVariants(b.subject).forEach(v => {
      if (!urlToUrisMap[v]) urlToUrisMap[v] = [];
      urlToUrisMap[v].push(b.uri);
    });
  });

  // 3. Like 検索
  const targets = [
    ...Object.keys(urlToUrisMap),
    ...bookmarksFromDb.map(b => b.uri),
  ];

  const likes = await prisma.like.findMany({
    where: { subject: { in: targets } },
    select: { subject: true, aturi: true },
  });

  // 4. uri → like.atUri[]
  const uriLikesMap: Record<string, string[]> = {};

  likes.forEach(like => {
    const matchedUris: string[] = [];

    if (like.subject.startsWith('http')) {
      // URL Like
      withTrailingSlashVariants(like.subject).forEach(v => {
        const uris = urlToUrisMap[v];
        if (uris) matchedUris.push(...uris);
      });
    } else {
      // AT URI Like
      Object.values(urlToUrisMap).forEach(uris => {
        if (uris.includes(like.subject)) matchedUris.push(...uris);
      });
      if (matchedUris.length === 0) matchedUris.push(like.subject);
    }

    [...new Set(matchedUris)].forEach(uri => {
      if (!uriLikesMap[uri]) uriLikesMap[uri] = [];
      uriLikesMap[uri].push(like.aturi);
    });
  });

  // 5. normalized にマージ
  return normalized.map(bookmark => {
    const variants = withTrailingSlashVariants(bookmark.subject);
    const commentCount = variants.reduce(
      (acc, v) => acc + (subjectCountMap[v] ?? 0),
      0,
    );

    return {
      ...bookmark,
      likes: [...new Set(uriLikesMap[bookmark.uri] ?? [])],
      commentCount,
    };
  });
}
