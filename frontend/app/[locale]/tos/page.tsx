import Breadcrumbs from "@/components/Breadcrumbs";
import { Container } from "@mantine/core";
import fs from "fs";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import path from "path";
import ReactMarkdown from "react-markdown";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function TosPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://rito.blue';
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": t("header.termofuse"),
    "description": t("description"),
    "url": `${baseUrl}/${locale}/tos`,
    "inLanguage": locale,
  };

  // tos フォルダ内の md を参照
  const filePath = path.join(process.cwd(), "app", "[locale]", "tos", `${locale}.md`);
  const fallbackPath = path.join(process.cwd(), "app", "[locale]", "tos", "en.md");

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    content = fs.readFileSync(fallbackPath, "utf-8");
  }

  return (
    <Container size="md" mx="auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumbs items={[{ label: t("header.termofuse") }]} />
      <ReactMarkdown>{content}</ReactMarkdown>
    </Container>
  );
}
