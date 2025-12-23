// frontend/app/[locale]/profile/[did]/page.tsx
import { Article } from '@/components/bookmarkcard/Article';
import Breadcrumbs from "@/components/Breadcrumbs";
import { SearchForm } from "./SearchForm";
import { prisma } from '@/logic/HandlePrismaClient';
import { SimpleGrid, Stack, Container, Text } from '@mantine/core';
import { Bookmark } from '@/type/ApiTypes';
import { normalizeBookmarks } from '@/logic/HandleBookmark';
import PaginationWrapper from '../../bookmark/search/latestbookmark/PaginationWrapper';
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from 'next';

type ProfileBookmarkProps = {
  params: { locale: string; did: string };
  searchParams?: { page?: string; tag?: string };
};

export async function generateMetadata({ params }: { params: { locale: string; did: string } }): Promise<Metadata> {
  const { locale, did } = await params;
  const t = await getTranslations({ locale });
  return {
    openGraph: {
      title: t('profile.title'),
      description: t('profile.description', { 0: did }),
      url: `https://rito.blue/${locale}/profile/${did}`,
      type: 'website',
    },
  };
}

const ProfileBookmarks = async ({ params, searchParams }: ProfileBookmarkProps) => {
  const { locale, did } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const query = (await searchParams) ?? {}; // 👈 ここ

  const page = query.page
    ? parseInt(Array.isArray(query.page) ? query.page[0] : query.page, 10)
    : 1;
  const take = 12;
  const skip = (page - 1) * take;

  const paginationQuery = { page: page.toString() };

  const decodedDid = decodeURIComponent(did);
  
  const tags = query.tag ? (Array.isArray(query.tag) ? query.tag : (query.tag as string).split(',')).map(t => t.trim()).filter(Boolean) : undefined;
  const whereBase = decodedDid.startsWith("did")
    ? { did: decodedDid }
    : { handle: decodedDid };

  const where: Record<string, unknown> = {
    ...whereBase,
    ...(tags && tags.length > 0
      ? {
        AND: tags.map(tagName => ({
          tags: {
            some: {
              tag: {
                name: tagName,
              },
            },
          },
        })),
      }
      : {}),
  };

  const bookmarks = await prisma.bookmark.findMany({
    where,
    orderBy: { indexed_at: 'desc' },
    take,
    skip,
    include: {
      comments: true,
      tags: { include: { tag: true } },
    },
  });

  const allBookmarks = (await prisma.bookmark.findMany({
    where: whereBase,
    include: {
      tags: { include: { tag: true } },
    },
  })) as Array<{
    tags: { tag: { name: string } }[];
  }>;

  // これで b, bt の any 警告は消える
  const allTags: string[] = Array.from(
    new Set(allBookmarks.flatMap(b => b.tags.map(bt => bt.tag.name)))
  );

  const totalCount = await prisma.bookmark.count({ where });
  const totalPages = Math.ceil(totalCount / take);

  const normalized: Bookmark[] = normalizeBookmarks(bookmarks);

  return (
    <Container size="md" mx="auto">
      <Breadcrumbs items={[{ label: t("header.profile") }, { label: decodedDid }]} />

      <SearchForm defaultTags={tags} userTags={allTags} did={decodedDid} />

      {normalized.length === 0 && <Text c="dimmed">{t('profile.inform.nobookmark')}</Text>}

      {normalized.length > 0 &&
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {normalized.map((b) => {
              const comment =
                b.comments?.find((c) => c.lang === locale) ||
                b.comments?.[0] || { title: '', comment: '', moderations: [] };

              const displayTitle = comment.title || '';
              const displayComment = comment.comment || '';

              const moderationList: string[] = comment.moderations || []
              const displayDate = new Date(b.indexedAt);

              return (
                <div key={b.uri} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Article
                    url={b.subject}
                    title={displayTitle}
                    handle={b.handle}
                    comment={displayComment}
                    tags={b.tags}
                    image={b.ogpImage}
                    date={displayDate}
                    moderations={moderationList}
                  />
                </div>
              );
            })}
          </SimpleGrid>
          <PaginationWrapper total={totalPages} page={page} query={paginationQuery} />
        </Stack>
      }
    </Container>
  );
};

export default ProfileBookmarks;
