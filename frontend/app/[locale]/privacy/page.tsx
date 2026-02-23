import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import { Container } from "@mantine/core";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

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
      <Breadcrumbs items={[{ label: t("header.privacypolicy") }]} />
      <ReactMarkdown>{content}</ReactMarkdown>
    </Container>
  );
}
