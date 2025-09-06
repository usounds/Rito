import { ActionIcon, useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { Sun } from 'lucide-react';
import { useEffect, useState } from "react";
import { Moon } from 'lucide-react';

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