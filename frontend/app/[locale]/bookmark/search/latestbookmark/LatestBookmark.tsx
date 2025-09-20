import { Article } from '@/components/bookmarkcard/Article';
import { prisma } from '@/logic/HandlePrismaClient';
import { SimpleGrid, Stack } from '@mantine/core';
import { normalizeBookmarks, Bookmark } from '@/type/ApiTypes';
import PaginationWrapper from './PaginationWrapper';
import type { Prisma } from '@prisma/client';

type PageProps = {
  params: { locale: string };
  searchParams?: {
    page?: string;
    sort?: 'created' | 'indexed';
    tag?: string[];
    handle?: string[];
    comment?: string;
  };
};

export async function LatestBookmark({ params, searchParams }: PageProps) {
  const page = searchParams?.page ? parseInt(searchParams.page) : 1;
  const take = 12;
  const skip = (page - 1) * take;

  // --- Prisma where 条件 ---
  const where: Prisma.BookmarkWhereInput = {};

  if (searchParams?.handle?.length) {
    where.handle = { in: searchParams.handle };
  }

  if (searchParams?.tag?.length) {
    where.tags = {
      some: {
        tag: {
          name: { in: searchParams.tag },
        },
      },
    };
  }

  if (searchParams?.comment === 'true') {
    where.comments = { some: {} };
  }

  // --- ソート ---
  const orderBy: Prisma.BookmarkOrderByWithRelationInput =
    searchParams?.sort === 'created' ? { created_at: 'desc' } : { indexed_at: 'desc' };

  // --- Prisma データ取得 ---
  const bookmarks = await prisma.bookmark.findMany({
    where,
    orderBy,
    take,
    skip,
    include: { comments: true, tags: { include: { tag: true } } },
  });

  const normalized: Bookmark[] = normalizeBookmarks(bookmarks);

  const totalCount = await prisma.bookmark.count({ where });
  const totalPages = Math.ceil(totalCount / take);

  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {normalized.map((b) => (
          <Article
            key={b.uri}
            url={b.subject}
            title={b.ogpTitle || ''}
            handle={b.handle}
            comment={b.ogpDescription || ''}
            tags={b.tags}
            image={b.ogpImage || undefined}
            date={new Date(b.indexedAt)}
            moderations={b.moderations || []}
          />
        ))}
      </SimpleGrid>

      <PaginationWrapper total={totalPages} page={page} query={searchParams ?? { page: '1' }} />
    </Stack>
  );
}
