import Breadcrumbs from "@/components/Breadcrumbs";
import { FeaturesGrid, getFeatureItems } from "@/components/features/Features";
import { routing } from "@/i18n/routing";
import { Container } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { getBaseUrl, getDefaultOgImage, getPublicPageAlternates } from "@/seo/publicPages";

export function generateStaticParams() {
    return routing.locales.map(locale => ({ locale }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale });
    const baseUrl = getBaseUrl();
    const ogImage = getDefaultOgImage(baseUrl);
    const title = `${t("header.about")} | ${t("title")}`;
    const description = t("aboutDetails.intro");

    return {
        title,
        description,
        alternates: getPublicPageAlternates(locale, '/about'),
        openGraph: {
            title,
            description,
            url: `${baseUrl}/${locale}/about`,
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

export default async function AboutPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    const baseUrl = getBaseUrl();
    const featureItems = getFeatureItems(t, locale);
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        "name": t("header.about"),
        "description": t("aboutDetails.intro"),
        "url": `${baseUrl}/${locale}/about`,
        "inLanguage": locale,
        "mainEntity": {
            "@type": "SoftwareApplication",
            "name": t("title"),
            "applicationCategory": "SocialNetworkingApplication",
            "operatingSystem": "All",
            "description": t("aboutDetails.intro"),
            "featureList": featureItems.map(feature => `${feature.title}: ${feature.description}`),
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
