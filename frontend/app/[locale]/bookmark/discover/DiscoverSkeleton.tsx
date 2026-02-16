"use client";

import { SimpleGrid, Card, Skeleton } from '@mantine/core';
import classes from './Discover.module.scss';

export default function DiscoverSkeleton() {
    return (
        <div className={classes.articleGrid}>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm" verticalSpacing="sm">
                {Array.from({ length: 9 }).map((_, index) => (
                    <Card key={index} withBorder radius="md" className={classes.skeletonCard}>
                        {/* Desktop layout */}
                        <div className={classes.skeletonDesktop}>
                            <Skeleton height={160} radius="sm" />
                            <Skeleton height={18} radius="sm" width="85%" />
                            <Skeleton height={14} radius="sm" width="70%" />
                            <Skeleton height={14} radius="sm" width="50%" />
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                <Skeleton height={22} width={60} radius="xl" />
                                <Skeleton height={22} width={80} radius="xl" />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                                <Skeleton height={14} width={120} radius="sm" />
                                <Skeleton height={14} width={60} radius="sm" />
                            </div>
                        </div>
                        {/* Mobile layout */}
                        <div className={classes.skeletonMobile}>
                            <div style={{ flex: 1 }}>
                                <Skeleton height={18} radius="sm" mb="xs" />
                                <Skeleton height={12} radius="sm" mb={6} />
                                <Skeleton height={12} radius="sm" mb={6} width="80%" />
                                <Skeleton height={20} width={60} radius="xl" />
                            </div>
                            <Skeleton height={67} width={120} radius="md" />
                        </div>
                    </Card>
                ))}
            </SimpleGrid>
        </div>
    );
}
