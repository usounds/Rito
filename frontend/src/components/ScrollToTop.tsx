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
                        style={transitionStyles}
                        onClick={() => scrollTo({ y: 0 })}
                        variant="filled"
                        color="blue"
                        aria-label="Scroll to top"
                    >
                        <ArrowUp style={{ width: rem(24), height: rem(24) }} />
                    </ActionIcon>
                )}
            </Transition>
        </Affix>
    );
}
