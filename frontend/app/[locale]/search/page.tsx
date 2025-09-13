import { LatestBookmark } from './latestbookmark/LatestBookmark';
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@mantine/core";
import { SearchForm } from './SearchForm';

export function generateStaticParams() {
  // ページネーションの静的生成（必要なら全ページ生成）
  return routing.locales.flatMap(locale =>
    Array.from({ length: 10 }, (_, i) => ({ locale, page: String(i + 1) }))
  );
}

type PageProps = {
  params: Promise<{ locale: string; page: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BookmarksPage({ params, searchParams }: PageProps) {
  // --- SSR 用に await ---
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const { locale, page } = resolvedParams;

  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  // --- tag を配列化 ---
  const tag = resolvedSearch.tag
    ? Array.isArray(resolvedSearch.tag)
      ? resolvedSearch.tag
      : [resolvedSearch.tag]
    : undefined;

  // --- handle を配列化 ---
  const handle = resolvedSearch.handle
    ? Array.isArray(resolvedSearch.handle)
      ? resolvedSearch.handle
      : [resolvedSearch.handle]
    : undefined;

  // --- query オブジェクト ---
  const query = {
    sort: resolvedSearch.sort as 'created' | 'updated' | undefined,
    tag,      // 複数対応
    handle,   // 複数対応
    page: parseInt(page, 10) || 1,
  };

  return (
    <Container size="md" mx="auto" my="sx">
      <SearchForm locale={locale} defaultTags={tag} defaultHandles={handle} />
      <LatestBookmark params={{ locale }} t={t} query={query} />
    </Container>
  );
}
