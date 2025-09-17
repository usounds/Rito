import Breadcrumbs from "@/components/Breadcrumbs";
import { routing } from "@/i18n/routing";
import { Container } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MyBookmark } from './MyBookmark';

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <Container size="md" mx="auto" my="sx">
        <Breadcrumbs items={[{ label:t("header.bookmark") }]} />
      <MyBookmark />
    </Container>
  );
}