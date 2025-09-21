"use client";

import { ActionIcon } from "@mantine/core";
import React from "react";
import { Languages } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useTopLoader } from 'nextjs-toploader';

const LanguageToggle: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname(); // 現在のパス
  const loader = useTopLoader();

  const toggleLocale = () => {
    const newLocale = pathname.startsWith("/ja") ? "en" : "ja";

    // /ja or /en を置換
    const newPath = pathname.replace(/^\/(ja|en)/, `/${newLocale}`);

    // クエリとハッシュを取得（CSR限定）
    const search = typeof window !== "undefined" ? window.location.search : "";
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    loader.start()
    router.replace(`${newPath}${search}${hash}`);
  };

  return (
    <ActionIcon
      onClick={toggleLocale}
      variant="default"
      size="lg"
      aria-label="Toggle language"
    >
      <Languages size={20} />
    </ActionIcon>
  );
};

export default LanguageToggle;
