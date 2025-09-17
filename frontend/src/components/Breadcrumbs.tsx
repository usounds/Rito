import { Breadcrumbs as MantineBreadcrumbs, Anchor,Stack } from "@mantine/core";

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[]; // Home以降のパンくず
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const crumbs = [
    { label: "Home"}, // 先頭固定
    ...items,
  ];

  const elements = crumbs.map((item, idx) =>
    item.href ? (
      <Anchor href={item.href} key={idx}>
        {item.label}
      </Anchor>
    ) : (
      <span key={idx}>{item.label}</span>
    )
  );

  return <Stack mb="sm"><MantineBreadcrumbs>{elements}</MantineBreadcrumbs></Stack>;
}
