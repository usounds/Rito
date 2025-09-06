"use client";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import type { Bookmark } from '@/type/ApiTypes';
import {
    Text
} from '@mantine/core';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { Article } from '@/components/bookmarkcard/Article';
import { Stack } from "@mantine/core";

export function MyBookmark() {
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const locale = useLocale();

    useEffect(() => {
        const fetchBookmarks = async () => {
            if (!activeDid) return
            const res = await fetch(`https://api.rito.blue/rpc/get_bookmark?p_did=${encodeURIComponent(activeDid)}`);

            if (!res.ok) {
                setIsLoading(false)
                throw new Error(`Failed to fetch bookmarks: ${res.statusText}`);

            }

            const data: Bookmark[] = await res.json(); // 型を Bookmark[] と指定
            setBookmarks(data)
            setIsLoading(false)
        };
        fetchBookmarks();
    }, [activeDid])

    if (isLoading) return <>Loading...</>;
    if (!isLoading && (bookmarks?.length===0 || !bookmarks)) return <>右下からックマークを登録してね！</>;
    if (!isLoading && !activeDid) return <>ログインしてね！</>;

return (
  <Stack gap="md">
    {bookmarks && bookmarks.map((b) => {
      const comment =
        b.comments.find((c) => c.lang === locale) || b.comments[0];

      return (
        <Article
          key={b.uri}
          url={b.subject}
          title={comment.title}
          comment={comment.comment}
          tags={b.tags}
          image={b.ogp_image}
        />
      );
    })}
  </Stack>
);

}