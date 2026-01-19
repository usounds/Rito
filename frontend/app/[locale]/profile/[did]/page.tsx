import Breadcrumbs from "@/components/Breadcrumbs";
import { SearchForm } from "./SearchForm";
import { prisma } from '@/logic/HandlePrismaClient';
import { Container, Text } from '@mantine/core';
import { Bookmark } from '@/type/ApiTypes';
import { InfiniteBookmarkList } from '@/components/InfiniteBookmarkList';
import { fetchBookmarks } from '../../bookmark/search/latestbookmark/data';
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
  const query = (await searchParams) ?? {};

  const page = query.page
    ? parseInt(Array.isArray(query.page) ? query.page[0] : query.page, 10)
    : 1;

  const decodedDid = decodeURIComponent(did);

  const tags = query.tag ? (Array.isArray(query.tag) ? query.tag : (query.tag as string).split(',')).map(t => t.trim()).filter(Boolean) : undefined;

  const bookmarkQuery = {
    did: decodedDid,
    tag: tags,
    page: page,
  };

  const result = await fetchBookmarks(bookmarkQuery);

  const whereBase = decodedDid.startsWith("did")
    ? { did: decodedDid }
    : { handle: decodedDid };

  const allBookmarks = (await prisma.bookmark.findMany({
    where: whereBase,
    include: {
      tags: { include: { tag: true } },
    },
  })) as Array<{
    tags: { tag: { name: string } }[];
  }>;

  // タグごとの件数を集計
  const tagCounts: Record<string, number> = {};
  allBookmarks.forEach(b => {
    b.tags.forEach(bt => {
      const name = bt.tag.name;
      tagCounts[name] = (tagCounts[name] || 0) + 1;
    });
  });

  const allTags: string[] = Object.keys(tagCounts);

  return (
    <Container size="md" mx="auto">
      <Breadcrumbs items={[{ label: t("header.profile") }, { label: decodedDid }]} />

      <SearchForm defaultTags={tags} userTags={allTags} tagCounts={tagCounts} did={decodedDid} />

      {result.items.length === 0 && <Text c="dimmed" mt="md">{t('profile.inform.nobookmark')}</Text>}

      {result.items.length > 0 &&
        <div style={{ marginTop: 'var(--mantine-spacing-md)' }}>
          <InfiniteBookmarkList
            initialItems={result.items}
            initialHasMore={result.hasMore}
            query={bookmarkQuery}
            locale={locale}
          />
        </div>
      }
    </Container>
  );
};

export default ProfileBookmarks;
