import { FeaturesGrid } from "@/components/features/Features";
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export const revalidate = 600; // 秒単位（600秒 = 10分）

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
        <FeaturesGrid t={t} locale={locale}/>
    </div>
  );
}
