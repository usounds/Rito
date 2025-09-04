import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Tabs, TabsList, TabsTab, TabsPanel } from '@mantine/core';
import { FaBookmark } from "react-icons/fa";
import { FaResolving } from "react-icons/fa";
import { CiSettings } from "react-icons/ci";

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
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <Tabs defaultValue="gallery">
        <TabsList>
          <TabsTab value="gallery" leftSection={<FaBookmark size={16} />}>
            {t('mybookmark.bookmark')}
          </TabsTab>
          <TabsTab value="messages" leftSection={<FaResolving size={16} />}>
            {t('mybookmark.resolver')}
          </TabsTab>
          <TabsTab value="settings" leftSection={<CiSettings size={16} />}>
            {t('mybookmark.settings')}
          </TabsTab>
        </TabsList>

        <TabsPanel value="gallery">
          Gallery tab content
        </TabsPanel>

        <TabsPanel value="messages">
          Messages tab content
        </TabsPanel>

        <TabsPanel value="settings">
          Settings tab content
        </TabsPanel>
      </Tabs>
    </div>
  );
}