"use client";

import { SimpleGrid, Card, Skeleton } from '@mantine/core';

export default function DiscoverSkeleton() {
    return (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm" verticalSpacing="sm">
            {Array.from({ length: 9 }).map((_, index) => (
                <Card key={index} withBorder radius="md">
                    <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                            <Skeleton height={20} radius="sm" mb="xs" />
                            <Skeleton height={12} radius="sm" mb={6} />
                            <Skeleton height={12} radius="sm" mb={6} width="80%" />
                            <Skeleton height={16} width={60} radius="xl" />
                        </div>
                        <Skeleton height={67} width={120} radius="md" />
                    </div>
                </Card>
            ))}
        </SimpleGrid>
    );
}
