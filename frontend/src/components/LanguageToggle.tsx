"use client";

import { ActionIcon } from '@mantine/core';
import React from "react";
import { IoLanguageSharp } from "react-icons/io5";
import { useRouter, usePathname } from 'next/navigation';

const LanguageToggle: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname(); // 現在のパスを取得

  const toggleLocale = () => {
    // ここで切り替えたい言語を決定
    const newLocale = pathname.startsWith('/ja') ? 'en' : 'ja';
    
    // 現在のパスのロケール部分を置換して遷移
    const newPath = pathname.replace(/^\/(ja|en)/, `/${newLocale}`);
    router.replace(newPath);
  };

  return (
    <ActionIcon
      onClick={toggleLocale}
      variant="default"
      size="lg"
      aria-label="Toggle language"
    >
      <IoLanguageSharp size={20} />
    </ActionIcon>
  );
};

export default LanguageToggle;
