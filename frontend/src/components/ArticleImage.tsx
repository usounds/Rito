import { useComputedColorScheme } from "@mantine/core";
import Image from "next/image";
import React, { useEffect, useState, useMemo, useCallback } from "react";

interface ArticleImageProps {
  src?: string | null;
  url: string;
  alt?: string;
  priority?: boolean;
}

// 通常画像
const normalizeUrl = (url?: string | null) => {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('//')) return `https:${url}`;
  return url;
};

const isValidUrl = (url?: string | null) => {
  if (!url || typeof url !== 'string') return false;
  // データURI、Blob、またはhttp/httpsで始まる絶対URL、あるいはスラッシュで始まる相対パス
  return url.startsWith('http') || url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:');
};

// YouTube動画IDを抽出
const extractYoutubeId = (url: string): string | null => {
  const match = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|embed)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  return match ? match[1] : null;
};

// ニコニコ動画IDを抽出
const extractNicoId = (url: string): string | null => {
  const match = url.match(/(?:nicovideo\.jp\/watch\/|nico\.ms\/)(sm\d+)/);
  return match ? match[1] : null;
};

const ArticleImage: React.FC<ArticleImageProps> = ({ src, url, alt = "Article Image", priority = false }) => {
  const computedColorScheme = useComputedColorScheme("light");
  const [mounted, setMounted] = useState(false);
  const [unoptimized, setUnoptimized] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  const dummyUrl = useMemo(() => {
    return mounted && computedColorScheme === "dark"
      ? "https://dummyimage.com/360x180/333/ccc.png&text=++no+image++"
      : "https://dummyimage.com/360x180/ced4da/ffffff.png&text=++no+image++";
  }, [mounted, computedColorScheme]);

  const currentSrc = useMemo(() => {
    if (errorCount >= 2) return dummyUrl;
    const normalized = normalizeUrl(src);
    return isValidUrl(normalized) ? normalized! : dummyUrl;
  }, [src, dummyUrl, errorCount]);

  useEffect(() => {
    // 非同期にすることで同期呼び出し警告を回避
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // src が変わったらエラーカウントをリセット
  useEffect(() => {
    const timer = setTimeout(() => {
      setErrorCount(0);
      setUnoptimized(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [src]);

  const youtubeId = useMemo(() => extractYoutubeId(url), [url]);
  const nicoId = useMemo(() => extractNicoId(url), [url]);

  const handleError = useCallback(() => {
    if (currentSrc === dummyUrl) return;

    if (errorCount === 0) {
      // 1回目のエラー: 最適化を無効にしてリトライ
      setUnoptimized(true);
      setErrorCount(1);
    } else if (errorCount === 1) {
      // 2回目のエラー: ダミー画像に切り替え
      setErrorCount(2);
      setUnoptimized(false);
    }
  }, [currentSrc, dummyUrl, errorCount]);

  // YouTubeの場合
  if (youtubeId) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          style={{ objectFit: "cover", position: "absolute", top: 0, left: 0 }}
        />
      </div>
    );
  }

  // ニコニコ動画の場合
  if (nicoId) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <iframe
          width="100%"
          height="100%"
          src={`https://embed.nicovideo.jp/watch/${nicoId}`}
          title="Niconico video player"
          frameBorder="0"
          allow="autoplay; fullscreen"
          allowFullScreen
          loading="lazy"
          style={{ objectFit: "cover", position: "absolute", top: 0, left: 0 }}
        />
      </div>
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes="(max-width: 48em) 90vw, (max-width: 62em) 45vw, 320px"
      style={{ objectFit: "cover" }}
      priority={priority}
      fetchPriority={priority ? "high" : undefined}
      onError={handleError}
      unoptimized={unoptimized || currentSrc.startsWith('data:') || currentSrc.startsWith('blob:')}
    />
  );
};

export default ArticleImage;
