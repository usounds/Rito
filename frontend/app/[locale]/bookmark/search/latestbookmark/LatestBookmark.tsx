import { Article } from '@/components/bookmarkcard/Article';
import { prisma } from '@/logic/HandlePrismaClient';
import { SimpleGrid, Stack } from '@mantine/core';
import { normalizeBookmarks, Bookmark } from '@/type/ApiTypes';

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
  const useComment = query.comment === 'true'; // ← コメント優先フラグ

  const page = query.page ? parseInt(query.page) : 1;
  const take = 12;
  const skip = (page - 1) * take;
  const orderField = query.sort === 'created' ? 'created_at' : 'indexed_at';

  // --- Prisma where 条件 ---
  const where: any = {};

  if (query.handle?.length) {
    where.handle = { in: query.handle };
  }

  if (query.tag?.length) {
    where.AND = query.tag.map((t) => ({
      tags: { some: { tag: { name: { equals: t, mode: 'insensitive' } } } },
    }));
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

  const normalized: Bookmark[] = normalizeBookmarks(bookmarks);

  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {normalized.map((b) => {
          // コメント優先フラグが true の場合は locale に対応したコメントを優先表示
          const comment =
            b.comments?.find((c) => c.lang === locale) ||
            b.comments?.[0] || { title: '', comment: '', moderations: [] };

          const displayTitle = useComment ? comment.title : b.ogpTitle || comment.title || '';
          const displayComment = useComment ? comment.comment : b.ogpDescription || comment.comment || '';

          const moderationList: string[] = useComment
            ? comment.moderations || []
            : [
                ...(b.moderations || []),
                ...((!b.ogpTitle || !b.ogpDescription) ? (comment.moderations || []) : []),
              ];

          const dateField: 'createdAt' | 'indexedAt' = query.sort === 'created' ? 'createdAt' : 'indexedAt';
          const displayDate = new Date(b[dateField]);

          return (
            <div key={b.uri} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Article
                url={b.subject}
                title={displayTitle}
                handle={b.handle}
                comment={displayComment}
                tags={b.tags}
                image={b.ogpImage || undefined}
                date={displayDate}
                moderations={moderationList}
              />
            </div>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
