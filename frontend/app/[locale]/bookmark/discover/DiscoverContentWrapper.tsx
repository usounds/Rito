"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ReactNode, useState, useTransition } from 'react';
import { categories } from './categories';
import DiscoverSkeleton from './DiscoverSkeleton';

export default function DiscoverContentWrapper({
    children,
    currentCategory
}: {
    children: ReactNode;
    currentCategory: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

    // Minimum swipe distance (in px)
    const minSwipeDistance = 80;
    // Maximum vertical distance to consider it a swipe (to avoid scrolling triggering swipe)
    const maxVerticalDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null); // Reset touch end
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;

        // Check if horizontal swipe distance is sufficient
        const isLeftSwipe = distanceX > minSwipeDistance;
        const isRightSwipe = distanceX < -minSwipeDistance;

        // Check if it's more horizontal than vertical
        if (Math.abs(distanceX) > Math.abs(distanceY) && Math.abs(distanceY) < maxVerticalDistance) {

            if (isLeftSwipe || isRightSwipe) {
                const currentIndex = categories.indexOf(currentCategory);
                let nextIndex = currentIndex;

                if (isLeftSwipe) {
                    // Next category
                    if (currentIndex < categories.length - 1) {
                        nextIndex = currentIndex + 1;
                    } else {
                        // Loop back to the first category
                        nextIndex = 0;
                    }
                } else {
                    // Previous category
                    if (currentIndex > 0) {
                        nextIndex = currentIndex - 1;
                    }
                }

                if (nextIndex !== currentIndex) {
                    const nextCategory = categories[nextIndex];
                    const params = new URLSearchParams(searchParams);
                    if (nextCategory === 'discover') {
                        params.delete('category');
                    } else {
                        params.set('category', nextCategory);
                    }

                    startTransition(() => {
                        router.push(`${pathname}?${params.toString()}`);
                    });
                }
            }
        }
    };

    return (
        <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ minHeight: '50vh' }} // Ensure there's a hit area even if content is short
        >
            {isPending ? <DiscoverSkeleton /> : children}
        </div>
    );
}
