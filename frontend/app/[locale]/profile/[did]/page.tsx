// frontend/app/[locale]/profile/[did]/page.tsx
import { Article } from '@/components/bookmarkcard/Article';
import Breadcrumbs from "@/components/Breadcrumbs";
import { prisma } from '@/logic/HandlePrismaClient';
import { Bookmark, normalizeBookmarks } from '@/type/ApiTypes';
import { Container, SimpleGrid, Stack, Text } from '@mantine/core';
import { getTranslations } from "next-intl/server";
import type { Metadata } from 'next';

type ProfileBookmarkProps = {
  params: { locale: string; did: string };
};


export async function generateMetadata({ params }: { params: { locale: string; did: string } }): Promise<Metadata> {
  const { locale, did } = await params;

  // 翻訳を取得
  const t = await getTranslations({ locale });

  // 親ページの metadata をそのままコピーする場合
  // ここでは必要な部分だけ上書き
  return {
    openGraph: {
      title: t('profile.title'),           // og:title
      description: t('profile.description', { 0: did }), // og:description
      url: `https://rito.blue/${locale}/profile/${did}`,  // og:url
      type: 'website',
    },
  };
}

const ProfileBookmarks = async ({ params }: ProfileBookmarkProps) => {
  const { locale, did } = await params;
  const t = await getTranslations({ locale });
  const take = 10;
  const skip = 0;

  const where: any = {};
  const decodedDid = decodeURIComponent(did); // URLデコード

  if (decodedDid && decodedDid.startsWith('did')) {
    where.did = decodedDid;
  } else {
    where.handle = decodedDid;

  }

  const bookmarks = await prisma.bookmark.findMany({
    where,
    orderBy: { indexed_at: 'desc' },
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
  });


  const normalized: Bookmark[] = normalizeBookmarks(bookmarks);

  return (
    <Container size="md" mx="auto" >
      <Breadcrumbs items={[{ label: t("header.profile") }, { label: decodedDid }]} />
      <Stack>
        {normalized.length===0 && <Text c="dimmed">{t('profile.inform.nobookmark')}</Text>}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {normalized.map((b) => {
            const comment =
              b.comments?.find(c => c.lang === locale) || b.comments?.[0] ||
              { title: '', comment: '', moderation_result: [] };

            const moderationList: string[] = [
              ...(b.moderations || []),
              ...((!b.ogpTitle || !b.ogpDescription) ? (comment.moderations || []) : []),
            ];

            const displayDate = new Date(b.indexedAt);

            return (
              <div key={b.uri} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Article
                  url={b.subject}
                  title={comment.title || b.ogpTitle || ''}
                  handle={b.handle}
                  comment={comment.comment || b.ogpDescription || ''}
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
    </Container>
  );
};

export default ProfileBookmarks;
