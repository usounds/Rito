import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from "react";

export function SwitchColorMode() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Toggle color scheme"
      >
        <Sun  />
      </ActionIcon>
    );
  }

  return (
    <ActionIcon
      onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
      variant="default"
      size="lg"
      aria-label="Toggle color scheme"
    >
      {computedColorScheme === 'dark' ? (
        <Sun />
      ) : (
        <Moon />
      )}
    </ActionIcon>
  );
}