import { Article } from '@/components/bookmarkcard/Article';
import type { Bookmark } from '@/type/ApiTypes';
import { SimpleGrid, Stack, Text } from '@mantine/core';
import { getTranslations } from "next-intl/server";
import { Container } from "@mantine/core";
import classes from './LatestBookmark.module.scss';

type LatestBookmarkProps = {
  params: { locale: string };
  t: Awaited<ReturnType<typeof getTranslations>>;
};

export const revalidate = 300;

export async function LatestBookmark({ params, t }: LatestBookmarkProps) {
  const locale = params.locale;

  // サーバー側で API 取得
  const res = await fetch('https://api.rito.blue/rpc/get_latest_bookmarks', {
    next: { revalidate: 300 }, // ISR
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch bookmarks: ${res.statusText}`);
  }

  const bookmarks: Bookmark[] = await res.json();

  return (
    < >
      <Stack py="md">
        <Text size="sm" className={classes.description}>
          {t('mybookmark.latest')}
        </Text>
      </Stack>

      <Stack >
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {bookmarks.map((b) => {
            const comment = b.comments.find((c) => c.lang === locale) || b.comments[0];

            return (
              <div
                key={b.uri}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <Article
                  url={b.subject}
                  title={b.ogp_title||comment.title}
                  comment={b.ogp_description}
                  tags={[]}
                  image={b.ogp_image}
                  date={new Date(b.indexed_at)}
                />
              </div>
            );
          })}
        </SimpleGrid>
      </Stack>
    </>
  );
}

