import '@mantine/core/styles.css';
import { setRequestLocale } from "next-intl/server";
import { MantineProvider, ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Notifications } from "@mantine/notifications";
import '@mantine/notifications/styles.css';
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/header/Header";

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
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <MantineProvider>
            <Notifications position="top-right" zIndex={1000} />
            <Header />
            {children}
        </MantineProvider>
      </NextIntlClientProvider>
    </body>
    </html >
  );
}
