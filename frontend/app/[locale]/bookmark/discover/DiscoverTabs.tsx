"use client";

import { Tabs, ScrollArea } from '@mantine/core';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { categories } from './categories';

export default function DiscoverTabs({ activeTab }: { activeTab: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations();
    const viewportRef = useRef<HTMLDivElement>(null);

    const handleTabChange = (value: string | null) => {
        if (!value) return;
        const params = new URLSearchParams(searchParams);
        if (value === 'discover') {
            params.delete('category');
        } else {
            params.set('category', value);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    useEffect(() => {
        if (viewportRef.current) {
            const activeTabElement = viewportRef.current.querySelector(`button[data-value="${activeTab}"]`) as HTMLElement;
            if (activeTabElement) {
                activeTabElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeTab]);

    return (
        <Tabs value={activeTab} onChange={handleTabChange} radius="md" mb="md">
            <ScrollArea type="hover" scrollbarSize={2} offsetScrollbars viewportRef={viewportRef}>
                <Tabs.List style={{ flexWrap: 'nowrap', width: '100%', minWidth: 'max-content' }}>
                    {categories.map((category) => (
                        <Tabs.Tab key={category} value={category} data-value={category} style={{ whiteSpace: 'nowrap' }}>
                            {t(`category.${category}`)}
                        </Tabs.Tab>
                    ))}
                </Tabs.List>
            </ScrollArea>
        </Tabs>
    );
}
