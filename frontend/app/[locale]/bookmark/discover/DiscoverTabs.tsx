"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { categories } from './categories';
import classes from './Discover.module.scss';
import {
    Compass,
    AtSign,
    Cpu,
    Globe,
    Gamepad2,
    Sparkles,
    Heart,
    Utensils,
    Plane,
    Layers,
    Camera,
} from 'lucide-react';

const categoryIcons: Record<string, React.ReactNode> = {
    discover: <Compass size={15} />,
    atprotocol: <AtSign size={15} />,
    technology: <Cpu size={15} />,
    social: <Globe size={15} />,
    anime_game: <Gamepad2 size={15} />,
    entertainment: <Sparkles size={15} />,
    lifestyle: <Heart size={15} />,
    food: <Utensils size={15} />,
    travel: <Plane size={15} />,
    photo: <Camera size={15} />,
    general: <Layers size={15} />,
};

export default function DiscoverTabs({ activeTab }: { activeTab: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations();
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleTabClick = (value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value === 'discover') {
            params.delete('category');
        } else {
            params.set('category', value);
        }
        router.push(`${pathname}?${params.toString()}`);
    };

    useEffect(() => {
        if (scrollRef.current) {
            const activeElement = scrollRef.current.querySelector(`[data-value="${activeTab}"]`) as HTMLElement;
            if (activeElement) {
                activeElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        }
    }, [activeTab]);

    return (
        <div className={classes.tabsContainer}>
            <div className={classes.tabsScroll} ref={scrollRef}>
                <div className={classes.tabsList}>
                    {categories.map((category) => (
                        <button
                            key={category}
                            data-value={category}
                            className={`${classes.tabItem} ${activeTab === category ? classes.tabItemActive : ''}`}
                            onClick={() => handleTabClick(category)}
                            type="button"
                        >
                            {categoryIcons[category]}
                            {t(`category.${category}`)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
