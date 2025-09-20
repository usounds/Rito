import { Article } from '@/components/bookmarkcard/Article';
import { prisma } from '@/logic/HandlePrismaClient';
import { SimpleGrid, Stack } from '@mantine/core';
import { normalizeBookmarks, Bookmark } from '@/type/ApiTypes';
import PaginationWrapper from './PaginationWrapper';

type PageProps = {
  params: { locale: string };
  searchParams?: { page?: string; sort?: 'created' | 'updated' };
};

export async function LatestBookmark({ params, searchParams }: PageProps) {
  const page = searchParams?.page ? parseInt(searchParams.page) : 1;
  const take = 12;
  const skip = (page - 1) * take;

  console.log('page:'+page)

  const bookmarks = await prisma.bookmark.findMany({
    orderBy: { indexed_at: 'desc' },
    take,
    skip,
    include: { comments: true, tags: { include: { tag: true } } },
  });

  const normalized: Bookmark[] = normalizeBookmarks(bookmarks);

  const totalCount = await prisma.bookmark.count();
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

      {/* ページネーションは Client Component に委譲 */}
      <PaginationWrapper total={totalPages} page={page} />
    </Stack>
  );
}
