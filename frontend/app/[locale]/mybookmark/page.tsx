import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  

  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://rito.blue';

  return {
    title: t("title"),
    description: t("ogp.description"), // OGP用説明文
    openGraph: {
      title: t("ogp.title"),
      description: t("ogp.description"),
      images: [
        {
          url: `${baseUrl}/rito_ogp.png`,
          width: 1200,
          height: 630,
          alt: t("ogp.title"),
        },
      ],
    },
  };
}

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
    <div>
        ぶっくまーく
    </div>
  );
}
