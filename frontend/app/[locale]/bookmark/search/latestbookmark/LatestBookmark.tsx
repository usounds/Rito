import { Article } from '@/components/bookmarkcard/Article';
import { prisma } from '@/logic/HandlePrismaClient';
import { SimpleGrid, Stack } from '@mantine/core';
import { getTranslations } from "next-intl/server";
import { normalizeBookmarks, Bookmark } from '@/type/ApiTypes';

type LatestBookmarkProps = {
  params: { locale: string };
  query?: {
    sort?: 'created' | 'updated';
    tag?: string[];       // 複数タグ対応
    handle?: string[];    // 複数 handle に対応
    page?: number;
  };
  t: Awaited<ReturnType<typeof getTranslations>>;
};

export async function LatestBookmark({ params, query, t }: LatestBookmarkProps) {
  const locale = params.locale;
  const page = query?.page ?? 1;
  const take = 10;
  const skip = (page - 1) * take;

  // ソートフィールド
  const orderField = query?.sort === 'created' ? 'created_at' : 'indexed_at';

  // Prisma の where 条件
  const where: any = {};

  // handle 絞り込み
  if (query?.handle?.length) {
    where.handle = { in: query.handle };
  }

  // タグ絞り込み
  if (query?.tag?.length) {
    where.AND = query.tag.map((t) => ({
      tags: {
        some: {
          tag: {
            name: {
              equals: t,
              mode: 'insensitive',
            },
          },
        },
      },
    }));
  }

  const bookmarks = await prisma.bookmark.findMany({
    where,
    orderBy: { [orderField]: 'desc' },
    take,
    skip,
    include: {
      comments: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
  })

  const normalized: Bookmark[] = normalizeBookmarks(bookmarks);

  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {normalized.map((b) => {
          const comment =
            b.comments?.find(c => c.lang === locale) || b.comments?.[0] ||
            { title: '', comment: '', moderation_result: [] };

          const moderationList: string[] = [
            ...(b.moderations || []),
            ...((!b.ogpTitle || !b.ogpDescription) ? (comment.moderations || []) : []),
          ];

          const orderField: 'createdAt' | 'indexedAt' =
            query?.sort === 'created' ? 'createdAt' : 'indexedAt';

          // displayDate にそのまま使う
          const displayDate = new Date(b[orderField]);

          return (
            <div key={b.uri} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Article
                url={b.subject}
                title={query?.handle?.length ? (comment.title || '') : (b.ogpTitle || comment.title || '')}
                handle={b.handle}
                comment={query?.handle?.length ? (comment.comment || '') : (b.ogpDescription || comment.comment || '')}
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
