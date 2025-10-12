import { useComputedColorScheme } from "@mantine/core";
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
      <div style={{ position: "relative", width: "100%", height: 180 }}>
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ objectFit: "cover", borderRadius: 8 }}
        />
      </div>
    );
  }

  // ニコニコ動画の場合
  if (nicoId) {
    return (
      <div style={{ position: "relative", width: "100%", height: 180 }}>
        <iframe
          width="100%"
          height="100%"
          src={`https://embed.nicovideo.jp/watch/${nicoId}`}
          title="Niconico video player"
          frameBorder="0"
          allow="autoplay; fullscreen"
          allowFullScreen
          style={{ objectFit: "cover", borderRadius: 8 }}
        />
      </div>
    );
  }

  // 通常画像
  const imageUrl = src && src.trim() !== "" ? src : dummyUrl;

  return (
    <img
      src={imageUrl}
      alt={alt}
      height={180}
      style={{ width: "100%", objectFit: "cover" }}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = dummyUrl;
      }}
    />
  );
};

export default ArticleImage;
