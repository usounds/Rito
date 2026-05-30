import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import { Container } from "@mantine/core";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { getBaseUrl, getDefaultOgImage, getPublicPageAlternates } from "@/seo/publicPages";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const baseUrl = getBaseUrl();
  const ogImage = getDefaultOgImage(baseUrl);
  const title = `${t("header.privacypolicy")} | ${t("title")}`;
  const description = t("description");

  return {
    title,
    description,
    alternates: getPublicPageAlternates(locale, '/privacy'),
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${locale}/privacy`,
      images: [{ ...ogImage, alt: title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage.url],
    },
  };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const baseUrl = getBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": t("header.privacypolicy"),
    "description": t("description"),
    "url": `${baseUrl}/${locale}/privacy`,
    "inLanguage": locale,
  };

  // privacy フォルダ内の md を参照
  const filePath = path.join(process.cwd(), "app", "[locale]", "privacy", `${locale}.md`);
  const fallbackPath = path.join(process.cwd(), "app", "[locale]", "privacy", "en.md");

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
      <Breadcrumbs items={[{ label: t("header.privacypolicy") }]} />
      <ReactMarkdown>{content}</ReactMarkdown>
    </Container>
  );
}
