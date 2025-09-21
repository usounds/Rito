import { Anchor, Breadcrumbs as MantineBreadcrumbs, Stack } from "@mantine/core";
import { useLocale, useTranslations } from "next-intl";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[]; // Home以降のパンくず
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const t = useTranslations(); // messages.breadcrumbs.home などに対応

    const locale = useLocale();
  const crumbs = [
    { label: t("header.home"), href: `/${locale}`}, // 先頭固定
    ...items,
  ];

  const elements = crumbs.map((item, idx) =>
    item.href ? (
      <Anchor href={item.href} key={idx} c="inherit" >
        {item.label}
      </Anchor>
    ) : (
      <span key={idx}>{item.label}</span>
    )
  );

  return <Stack mb="sm"><MantineBreadcrumbs>{elements}</MantineBreadcrumbs></Stack>;
}
