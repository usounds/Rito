"use client";
import { Breadcrumbs as MantineBreadcrumbs, Anchor, Stack } from "@mantine/core";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[]; // Home以降のパンくず
}

const baseUrl = (process.env.NEXT_PUBLIC_URL || "https://rito.blue").replace(/\/$/, "");

function getStructuredDataUrl(href: string, locale: string) {
  if (/^https?:\/\//.test(href)) {
    return href;
  }

  if (href === "/") {
    return `${baseUrl}/${locale}`;
  }

  return `${baseUrl}/${locale}${href.startsWith("/") ? href : `/${href}`}`;
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const t = useTranslations(); // messages.breadcrumbs.home などに対応
  const locale = useLocale();

  const crumbs = [
    { label: t("header.home"), href: "/" }, // 先頭固定
    ...items,
  ];

  const elements = crumbs.map((item, idx) =>
    item.href ? (
      <Anchor component={Link} href={item.href} key={idx} c="inherit" >
        {item.label}
      </Anchor>
    ) : (
      <span key={idx}>{item.label}</span>
    )
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": crumbs.map((item, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": item.label,
      ...(item.href ? { "item": getStructuredDataUrl(item.href, locale) } : {})
    }))
  };

  return (
    <Stack mt="xl" mb="sm">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MantineBreadcrumbs>{elements}</MantineBreadcrumbs>
    </Stack>
  );
}
