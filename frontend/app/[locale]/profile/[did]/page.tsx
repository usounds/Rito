// frontend/app/[locale]/profile/[did]/page.tsx
import { Article } from '@/components/bookmarkcard/Article';
import { prisma } from '@/logic/HandlePrismaClient';
import { SimpleGrid, Stack, Container } from '@mantine/core';
import { normalizeBookmarks, Bookmark } from '@/type/ApiTypes';
import Breadcrumbs from "@/components/Breadcrumbs";
import { getTranslations, setRequestLocale } from "next-intl/server";

type ProfileBookmarkProps = {
  params: { locale: string; did: string };
};

const ProfileBookmarks = async ({ params }: ProfileBookmarkProps) => {
  const { locale, did } = params;
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

              <Breadcrumbs items={[{ label:t("header.profile") },{label:decodedDid}]} />
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
