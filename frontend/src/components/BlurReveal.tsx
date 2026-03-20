"use client";

import { useState, ReactNode, useMemo } from "react";
import { Box } from "@mantine/core";
import { usePreferenceStore } from "@/state/Preference";

interface BlurRevealProps {
  children: ReactNode;
  blurAmount?: number;       // ぼかしの強さ(px)
  overlayText?: string;      // クリック前に表示する文字
  moderated?: boolean;       // ぼかす対象かどうか
  moderations?: string[];    // モデレーションカテゴリ
}

export function BlurReveal({
  children,
  blurAmount = 6,
  overlayText = "Click to reveal",
  moderated = true,
  moderations = [],
}: BlurRevealProps) {
  const unblurModerationCategories = usePreferenceStore(state => state.unblurModerationCategories);
  const isHydrated = usePreferenceStore(state => state.isHydrated);

  const shouldBlur = useMemo(() => {
    if (!moderated) return false;
    if (!isHydrated) return true; // デフォルトはぼかす

    // moderations が空の場合は、単にmoderatedフラグに従う（互換性のため）
    if (moderations.length === 0) {
      // 全体設定などが将来的にあればここで判定するが、現状は個別カテゴリがない場合はぼかす
      return true;
    }

    // いずれかのカテゴリが「許可されていない」場合はぼかす
    return moderations.some(cat => !unblurModerationCategories.includes(cat));
  }, [moderated, isHydrated, moderations, unblurModerationCategories]);

  const [isRevealed, setIsRevealed] = useState(!shouldBlur);
  if (!shouldBlur) return <>{children}</>;

  return (
    <Box style={{ position: "relative", display: "inline-block" }}>
      {/* 子要素は常に表示 */}
      <Box style={{ filter: isRevealed ? "none" : `blur(${blurAmount}px)`, transition: "filter 0.25s" }}>
        {children}
      </Box>

      {/* 初期オーバーレイ */}
      {!isRevealed && (
        <Box
          style={{
            position: "absolute",
            inset: 0,
            backdropFilter: `blur(${blurAmount}px)`,
            WebkitBackdropFilter: `blur(${blurAmount}px)`,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "left",
            cursor: "pointer",
            textAlign: "center",
            padding: "0 8px",
          }}
          onClick={() => setIsRevealed(true)}
        >
          {overlayText}
        </Box>
      )}
    </Box>
  );
}
