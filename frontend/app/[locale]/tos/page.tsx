import Breadcrumbs from "@/components/Breadcrumbs";
import { Container, Paper, Typography } from "@mantine/core";
import fs from "fs";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import path from "path";
import ReactMarkdown from "react-markdown";
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
  const title = `${t("header.termofuse")} | ${t("title")}`;
  const description = t("description");

  return {
    title,
    description,
    alternates: getPublicPageAlternates(locale, '/tos'),
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${locale}/tos`,
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

export default async function TosPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  const baseUrl = getBaseUrl();
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
    <Container size="md" mx="auto" my="xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumbs items={[{ label: t("header.termofuse") }]} />
      <Paper
        p={{ base: "md", sm: "xl" }}
        style={{
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          borderRadius: "24px",
          boxShadow: "var(--glass-shadow)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
        }}
      >
        <Typography>
          <ReactMarkdown>{content}</ReactMarkdown>
        </Typography>
      </Paper>
    </Container>
  );
}
