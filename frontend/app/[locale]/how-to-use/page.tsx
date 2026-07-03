import Breadcrumbs from "@/components/Breadcrumbs";
import { HowToUseGuide } from "@/components/features/Features";
import { routing } from "@/i18n/routing";
import { getBaseUrl, getDefaultOgImage, getPublicPageAlternates } from "@/seo/publicPages";
import { Container } from "@mantine/core";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

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
    const title = t("howToUseDetails.meta.title");
    const description = t("howToUseDetails.intro");

    return {
        title,
        description,
        alternates: getPublicPageAlternates(locale, '/how-to-use'),
        openGraph: {
            title,
            description,
            url: `${baseUrl}/${locale}/how-to-use`,
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

export default async function HowToUsePage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    const baseUrl = getBaseUrl();
    const workflowKeys = ['save', 'organize', 'discover'] as const;
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": t("howToUseDetails.hero.title"),
        "description": t("howToUseDetails.intro"),
        "url": `${baseUrl}/${locale}/how-to-use`,
        "inLanguage": locale,
        "step": workflowKeys.map((key, index) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "name": t(`howToUseDetails.workflow.${key}.title`),
            "text": t(`howToUseDetails.workflow.${key}.description`),
        })),
    };

    return (
        <div>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Container>
                <Breadcrumbs items={[{ label: t("header.howToUse") }]} />
            </Container>
            <HowToUseGuide t={t} locale={locale} />
        </div>
    );
}
