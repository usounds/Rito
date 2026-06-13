'use client';

import { Affix, ActionIcon, Transition, rem } from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
    const [scroll, scrollTo] = useWindowScroll();

    return (
        <Affix position={{ bottom: 20, left: 20 }}>
            <Transition transition="slide-up" mounted={scroll.y > 400}>
                {(transitionStyles) => (
                    <ActionIcon
                        size="lg"
                        radius="xl"
                        style={{
                            ...transitionStyles,
                            background: 'var(--glass-bg)',
                            backdropFilter: 'var(--glass-blur)',
                            WebkitBackdropFilter: 'var(--glass-blur)',
                            border: '1px solid var(--glass-border)',
                            boxShadow: 'var(--glass-shadow)',
                            color: 'var(--mantine-color-blue-6)',
                            transition: 'background-color 0.3s, border-color 0.3s, transform 0.2s',
                        }}
                        onClick={() => scrollTo({ y: 0 })}
                        aria-label="Scroll to top"
                    >

                        <ArrowUp style={{ width: rem(24), height: rem(24) }} />
                    </ActionIcon>
                )}
            </Transition>
        </Affix>
    );
}
