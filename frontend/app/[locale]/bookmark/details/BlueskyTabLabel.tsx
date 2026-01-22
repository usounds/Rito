'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const CONSTELLATION_BASE_URL = "https://constellation.microcosm.blue";
const MICROCOSM_USER_AGENT = "Rito @rito.blue";

interface BlueskyTabLabelProps {
    subjectUrl: string;
}

export function BlueskyTabLabel({ subjectUrl }: BlueskyTabLabelProps) {
    const t = useTranslations();
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
        async function fetchCount() {
            try {
                const backlinksUrl = `${CONSTELLATION_BASE_URL}/links?target=${encodeURIComponent(subjectUrl)}&collection=app.bsky.feed.post&path=.embed.external.uri&limit=1`;
                const res = await fetch(backlinksUrl, {
                    headers: {
                        "User-Agent": MICROCOSM_USER_AGENT,
                        "X-User-Agent": MICROCOSM_USER_AGENT
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCount(data.total || 0);
                } else {
                    setCount(0);
                }
            } catch (e) {
                console.error("fetchCount error:", e);
                setCount(0);
            }
        }
        fetchCount();
    }, [subjectUrl]);

    return (
        <>
            {t('detail.bluesky')}({count !== null ? count : '-'})
        </>
    );
}
