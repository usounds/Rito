import { Article } from '@/components/bookmarkcard/Article';
import { prisma } from '@/logic/HandlePrismaClient';
import { SimpleGrid, Stack } from '@mantine/core';
import {  enrichBookmarks } from '@/logic/HandleBookmark';
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
  // normalized に likes をマージ
  const bookmarksWithLikes = await enrichBookmarks(bookmarks, prisma);

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
      <PaginationWrapper total={totalPages} page={page} query={query} />
    </Stack>
  );
}
