"use client";

import { useState, ReactNode } from "react";
import { Box } from "@mantine/core";

interface BlurRevealProps {
  children: ReactNode;
  blurAmount?: number;       // ぼかしの強さ(px)
  overlayText?: string;      // クリック前に表示する文字
  moderated?: boolean;       // ぼかす対象かどうか
}

export function BlurReveal({
  children,
  blurAmount = 6,
  overlayText = "Click to reveal",
  moderated = true,
}: BlurRevealProps) {
  const [isRevealed, setIsRevealed] = useState(!moderated);
  if (!moderated) return <>{children}</>;

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
            background: "rgba(255,255,255,0.3)", // 半透明オーバーレイ
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
