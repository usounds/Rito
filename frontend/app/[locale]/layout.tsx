import { Footer } from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import { routing } from "@/i18n/routing";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from '@mantine/core';
import '@mantine/core/styles.css';
import { Notifications } from "@mantine/notifications";
import '@mantine/notifications/styles.css';
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import Script from "next/script";
import NextTopLoader from 'nextjs-toploader';

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
      url: `${baseUrl}/${locale}`,
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

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // 無効な言語の場合は404ページを表示
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // SSG対応
  setRequestLocale(locale);
  // 言語ファイルの読み込み
  const messages = await getMessages();

  return (
    <html lang={locale} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        {/* GA4 gtag.js を非同期で読み込む */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-TD8B3FMRTJ"
          strategy="afterInteractive"
        />

        {/* GA4 初期化 */}
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-TD8B3FMRTJ');
          `}
        </Script>
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <MantineProvider>
            <Notifications position="top-right" zIndex={1000} />
            <NextTopLoader
              showSpinner={false}
              template='<div class="bar" role="bar"></div>' // スピナーを削除したテンプレート
            />
            <Header />
            {children}
            <Footer locale={locale}/>
          </MantineProvider>
        </NextIntlClientProvider>
      </body>
    </html >
  );
}
