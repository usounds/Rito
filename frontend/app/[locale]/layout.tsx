import '@mantine/core/styles.css';
import '../globals.css';


import { MantineProvider, ColorSchemeScript, mantineHtmlProps, createTheme } from '@mantine/core';
import { Notifications } from "@mantine/notifications";
import '@mantine/notifications/styles.css';
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/header/Header";
import { Footer } from "@/components/footer/Footer";
import { getTranslations, setRequestLocale } from "next-intl/server";
import NextTopLoader from 'nextjs-toploader';
import Script from "next/script";
import { ScrollToTop } from "@/components/ScrollToTop";
import { getBaseUrl, getDefaultOgImage } from "@/seo/publicPages";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  display: "optional",
  variable: "--font-outfit",
});

// Suppress false-positive React 19 warning for ColorSchemeScript in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const origError = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) {
      return;
    }
    origError.apply(console, args);
  };
}


const theme = createTheme({
  fontFamily: `var(--font-outfit), var(--mantine-font-family)`,
  components: {
    Modal: {
      styles: {
        content: {
          background: 'light-dark(rgba(255, 255, 255, 0.88), rgba(15, 15, 20, 0.88))',
          color: 'light-dark(var(--mantine-color-black), var(--mantine-color-white))',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        },
        header: {
          background: 'transparent',
        },
        overlay: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'light-dark(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.65))',
        },
      },
    },
    Drawer: {
      styles: {
        content: {
          background: 'light-dark(rgba(255, 255, 255, 0.88), rgba(15, 15, 20, 0.88))',
          color: 'light-dark(var(--mantine-color-black), var(--mantine-color-white))',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        },
        header: {
          background: 'transparent',
        },
        overlay: {
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          backgroundColor: 'light-dark(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6))',
        },
      },
    },

  },
});



export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const baseUrl = getBaseUrl();
  const ogImage = getDefaultOgImage(baseUrl);

  return {
    metadataBase: new URL(baseUrl),
    title: t("title"),
    description: t("ogp.description"), // OGP用説明文
    openGraph: {
      title: t("ogp.title"),
      description: t("ogp.description"),
      url: `${baseUrl}/${locale}`,
      images: [
        {
          ...ogImage,
          alt: t("ogp.title"),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t("ogp.title"),
      description: t("ogp.description"),
      images: [ogImage.url],
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
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${outfit.variable} ${outfit.className}`}>
        <NextIntlClientProvider messages={messages}>
          <MantineProvider theme={theme}>
            <Notifications position="top-right" zIndex={1000} />
            <NextTopLoader
              showSpinner={false}
              template='<div class="bar" role="bar"></div>' // スピナーを削除したテンプレート
            />
            <Header />
            <main>{children}</main>
            <Footer locale={locale} />
            <ScrollToTop />
          </MantineProvider>
        </NextIntlClientProvider>
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
      </body>
    </html >
  );
}

