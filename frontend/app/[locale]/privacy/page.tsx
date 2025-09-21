import Breadcrumbs from "@/components/Breadcrumbs";
import { Container } from "@mantine/core";
import fs from "fs";
import { getTranslations } from "next-intl/server";
import path from "path";
import ReactMarkdown from "react-markdown";

interface PageProps {
  params: { locale: string };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
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
