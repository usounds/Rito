import Breadcrumbs from "@/components/Breadcrumbs";
import { FeaturesGrid } from "@/components/features/Features";
import { routing } from "@/i18n/routing";
import { Container } from "@mantine/core";
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
            <Container>
                <Breadcrumbs items={[{ label: t("header.about") }]} />
            </Container>
            <FeaturesGrid t={t} locale={locale} />
        </div>
    );
}
