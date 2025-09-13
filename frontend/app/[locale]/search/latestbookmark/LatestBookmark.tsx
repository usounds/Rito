import { Article } from '@/components/bookmarkcard/Article';
import type { Bookmark } from '@/type/ApiTypes';
import { SimpleGrid, Stack, Text } from '@mantine/core';
import { getTranslations } from "next-intl/server";
import { Container } from "@mantine/core";
import { getPrisma } from '../../../../src/logic/HandlePrismaClient';
import classes from './LatestBookmark.module.scss';
import type { PrismaBookmarkWithRelations } from '@/type/ApiTypes';

type LatestBookmarkProps = {
  params: { locale: string };
  t: Awaited<ReturnType<typeof getTranslations>>;
};

export const revalidate = 300;
export async function LatestBookmark({ params, t }: LatestBookmarkProps) {
  const locale = params.locale;

  // API Route から取得
  console.log(`${process.env.NEXT_PUBLIC_URL}/api/getLatestBookmark`)
const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/getLatestBookmark`);
  if (!res.ok) {
    throw new Error(`Failed to fetch bookmarks: ${res.statusText}`);
  }

  const bookmarks: Bookmark[] = (await res.json()).map((b: any) => ({
    ...b,
    moderation_result: b.moderation_result?.split(',') ?? [],
    comments: b.comments.map((c: any) => ({
      ...c,
      moderation_result: c.moderation_result?.split(',') ?? [],
    })),
    tags: b.tags.map((t: any) => t.name),
  }));

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

            return (
              <div
                key={b.uri}
                style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <Article
                  url={b.subject}
                  title={b.ogp_title || comment.title}
                  comment={b.ogp_description || comment.comment || ""}
                  tags={b.tags ?? []}
                  image={b.ogp_image}
                  date={new Date(b.indexed_at)}
                  moderations={[
                    ...b.moderation_result,
                    ...(!b.ogp_description && comment.moderation_result
                      ? comment.moderation_result
                      : []),
                  ]}
                />
              </div>
            );
          })}
        </SimpleGrid>
      </Stack>
    </>
  );
}
