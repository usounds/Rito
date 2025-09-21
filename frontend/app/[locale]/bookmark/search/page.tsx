import { LatestBookmark } from './latestbookmark/LatestBookmark';
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@mantine/core";
import { SearchForm } from './SearchForm';
import Breadcrumbs from "@/components/Breadcrumbs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export function generateStaticParams() {
  return routing.locales.flatMap(locale =>
    Array.from({ length: 10 }, (_, i) => ({ locale, page: String(i + 1) }))
  );
}

type PageProps = {
  params: Promise<{ locale: string; page?: string }>;
  searchParams: Promise<{
    page?: string;
    sort?: 'created' | 'indexed';
    tag?: string[];
    handle?: string[];
    comment?: string;
  }>;
};

export default async function BookmarksPage(props: PageProps) {
  // --- await 必須 ---
  const params = await props.params;
  const searchParams = await props.searchParams;

  const locale = params.locale;
  const pageStr = searchParams.page ?? params.page ?? '1';

  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  // --- タグ ---
  const tag = searchParams.tag
    ? (Array.isArray(searchParams.tag)
      ? searchParams.tag
      : (searchParams.tag as string).split(',')
    )
      .map(t => t.trim())
      .filter(Boolean)
    : undefined;
    
  // --- ハンドル ---
  const handle = searchParams.handle
    ? (Array.isArray(searchParams.handle)
      ? searchParams.handle
      : (searchParams.handle as string).split(',')
    )
      .map(h => h.trim())
      .filter(Boolean)
    : undefined;
  // --- ソート ---
  const sort = searchParams.sort === 'created' ? 'created' : 'indexed';

  // --- コメントフラグ ---
  const comment = searchParams.comment === 'true' ? 'true' : undefined;

  // --- LatestBookmark に渡す query ---
  const query: Record<string, string | string[]> = { page: pageStr };
  if (tag) query.tag = tag;
  if (handle) query.handle = handle;
  if (sort) query.sort = sort;
  if (comment) query.comment = comment;

  return (
    <Container size="md" mx="auto" my="sx">
      <Breadcrumbs items={[{ label: t("header.bookmarkMenu") }, { label: t("header.browse") }]} />
      <SearchForm locale={locale} defaultTags={tag} defaultHandles={handle} />
      <LatestBookmark params={{ locale }} searchParams={query} />
    </Container>
  );
}
