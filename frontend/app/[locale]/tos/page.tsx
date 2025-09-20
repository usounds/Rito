import fs from "fs";
import path from "path";
import ReactMarkdown from "react-markdown";
import { Container} from "@mantine/core";

interface PageProps {
  params: { locale: string };
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;

  // privacy フォルダ内の md を参照
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
      <ReactMarkdown>{content}</ReactMarkdown>
    </Container>
  );
}
