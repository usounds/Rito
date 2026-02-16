import { useComputedColorScheme } from "@mantine/core";
import Image from "next/image";
import React, { useEffect, useState } from "react";

interface ArticleImageProps {
  src?: string | null;
  url: string;
  alt?: string;
}

const ArticleImage: React.FC<ArticleImageProps> = ({ src, url, alt = "Article Image" }) => {
  const computedColorScheme = useComputedColorScheme("light");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dummyUrl =
    mounted && computedColorScheme === "dark"
      ? "https://dummyimage.com/360x180/333/ccc.png&text=++no+image++"
      : "https://dummyimage.com/360x180/ced4da/ffffff.png&text=++no+image++";

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

  const youtubeId = extractYoutubeId(url);
  const nicoId = extractNicoId(url);

  // YouTubeの場合
  if (youtubeId) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
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
          style={{ objectFit: "cover", position: "absolute", top: 0, left: 0 }}
        />
      </div>
    );
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

  const initialRaw = normalizeUrl(src);
  const initialSrc = isValidUrl(initialRaw) ? initialRaw! : dummyUrl;
  const [imgSrc, setImgSrc] = useState<string>(initialSrc);
  const [unoptimized, setUnoptimized] = useState(false);

  useEffect(() => {
    const normalized = normalizeUrl(src);
    setImgSrc(isValidUrl(normalized) ? normalized! : dummyUrl);
    setUnoptimized(false);
  }, [src, dummyUrl]);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      style={{ objectFit: "cover" }}
      onError={() => {
        if (imgSrc === dummyUrl) return;

        if (!unoptimized) {
          // まずは最適化を無効にしてリトライ（Google画像などBot判定されるケース対策）
          setUnoptimized(true);
        } else {
          // それでもだめならダミー画像
          setImgSrc(dummyUrl);
          // ダミー画像は最適化したいのでフラグをリセット
          setUnoptimized(false);
        }
      }}
      unoptimized={unoptimized || imgSrc.startsWith('data:') || imgSrc.startsWith('blob:')} // データURI系またはリトライ時は最適化しない
    />
  );
};

export default ArticleImage;
