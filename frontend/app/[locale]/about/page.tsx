import { FeaturesGrid } from "@/components/features/Features";
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";

export function generateStaticParams() {
    return routing.locales.map(locale => ({ locale }));
}

export default async function AboutPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    return (
        <div>
            <FeaturesGrid t={t} locale={locale} />
        </div>
    );
}
