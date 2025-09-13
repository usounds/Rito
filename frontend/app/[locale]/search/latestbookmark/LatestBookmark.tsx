import { Article } from '@/components/bookmarkcard/Article';
import type { Bookmark } from '@/type/ApiTypes';
import { SimpleGrid, Stack, Text } from '@mantine/core';
import { getTranslations } from "next-intl/server";
import { Container } from "@mantine/core";
import classes from './LatestBookmark.module.scss';
import { prisma } from '@/logic/HandlePrismaClient';

type LatestBookmarkProps = {
  params: { locale: string };
  t: Awaited<ReturnType<typeof getTranslations>>;
};

export const revalidate = 300;
export async function LatestBookmark({ params, t }: LatestBookmarkProps) {
  const locale = params.locale;

  const bookmarks = await prisma.bookmark.findMany({
    orderBy: { indexed_at: 'desc' },
    take: 9,
    include: {
      comments: true,
      tags: {
        include: { tag: true } // ← Tag.name を取得
      },
    },
  });

  return (
    <>
      <Stack py="md">
        <Text size="sm" className={classes.description}>
          {t('mybookmark.latest')}
        </Text>
      </Stack>

      <Stack>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {bookmarks.map((b) => {
            const comment =
              b.comments?.find((c) => c.lang === locale) ||
              b.comments?.[0] ||
              { title: '', comment: '', moderation_result: [] };

            const moderationList: string[] = [
              ...(b.moderation_result
                ? b.moderation_result.split(',').map(s => s.trim())
                : []),
              ...(!b.ogp_description && comment.moderation_result
                ? Array.isArray(comment.moderation_result)
                  ? comment.moderation_result
                  : comment.moderation_result.split(',').map(s => s.trim())
                : []),
            ];

            return (
              <div
                key={b.uri}
                style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <Article
                  url={b.subject}
                  title={b.ogp_title || comment.title || ''}
                  comment={b.ogp_description || comment.comment || ''}
                  tags={b.tags?.map(bt => bt.tag?.name).filter(Boolean) ?? []}
                  image={b.ogp_image || undefined}
                  date={new Date(b.indexed_at)}
                  moderations={moderationList}
                />
              </div>
            );
          })}
        </SimpleGrid>
      </Stack>
    </>
  );
}
