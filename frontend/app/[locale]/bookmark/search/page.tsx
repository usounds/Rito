import { LatestBookmark } from './latestbookmark/LatestBookmark';
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@mantine/core";
import { SearchForm } from './SearchForm';

export function generateStaticParams() {
  return routing.locales.flatMap(locale =>
    Array.from({ length: 10 }, (_, i) => ({ locale, page: String(i + 1) }))
  );
}

type PageProps = {
  params: { locale: string; page: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function BookmarksPage({ params, searchParams }: PageProps) {
  const { locale, page } = params;

  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const tag = searchParams.tag
    ? searchParams.tag.toString().split(',').map(t => t.trim()).filter(Boolean)
    : undefined;

  const handle = searchParams.handle
    ? searchParams.handle.toString().split(',').map(h => h.trim()).filter(Boolean)
    : undefined;

  const query = {
    sort: searchParams.sort as 'created' | 'updated' | undefined,
    tag,
    handle,
    page: parseInt(page, 10) || 1,
  };

  return (
    <Container size="md" mx="auto" my="sx">
      {/* SearchForm はクライアントコンポーネントなので props で URL 情報を渡す */}
      <SearchForm locale={locale} defaultTags={tag} defaultHandles={handle} />
      <LatestBookmark params={{ locale }} t={t} query={query} />
    </Container>
  );
}
