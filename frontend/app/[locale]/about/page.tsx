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

    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://rito.blue';
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        "name": t("header.about"),
        "description": t("description"),
        "url": `${baseUrl}/${locale}/about`,
        "inLanguage": locale,
        "mainEntity": {
            "@type": "SoftwareApplication",
            "name": t("title"),
            "applicationCategory": "SocialNetworkingApplication",
            "operatingSystem": "All",
            "description": t("description"),
        }
    };

    return (
        <div>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Container>
                <Breadcrumbs items={[{ label: t("header.about") }]} />
            </Container>
            <FeaturesGrid t={t} locale={locale} />
        </div>
    );
}
