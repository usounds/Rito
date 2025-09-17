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
  params: Promise<{ locale: string; page: string }>; // Promiseに変更
  searchParams: Promise<Record<string, string | string[] | undefined>>; // これもPromiseに変更
};

export default async function BookmarksPage(props: PageProps) {
  // paramsとsearchParamsをawaitで取得
  const params = await props.params;
  const searchParams = await props.searchParams;

  const locale = params.locale;
  const page = params.page;

  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const tag = searchParams.tag
    ? (Array.isArray(searchParams.tag) ? searchParams.tag : searchParams.tag.split(','))
      .map(t => t.trim())
      .filter(Boolean)
    : undefined;

  const handle = searchParams.handle
    ? (Array.isArray(searchParams.handle) ? searchParams.handle : searchParams.handle.split(','))
      .map(h => h.trim())
      .filter(Boolean)
    : undefined;

  const sort = searchParams.sort as 'created' | 'updated' | undefined;

  const query = {
    sort,
    tag,
    handle,
    page: parseInt(page, 10) || 1,
  };

  return (
    <Container size="md" mx="auto" my="sx">
      <Breadcrumbs items={[{ label: t("header.bookmarkMenu") },{ label: t("header.browse") }]} />
      <SearchForm locale={locale} defaultTags={tag} defaultHandles={handle} />
      <LatestBookmark params={{ locale }} t={t} query={query} />
    </Container>
  );
}