"use client";
import { LoginButtonOrUser } from '@/components/header/LoginButtonOrUser';
import LanguageToggle from '@/components/LanguageToggle';
import { SwitchColorMode } from '@/components/SwitchColorMode';
import {
  Box,
  Burger,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
  useMantineTheme
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useLocale, useMessages } from 'next-intl';
import Link from 'next/link';
import { Bookmark, AtSign, FileText } from 'lucide-react';
import classes from './Header.module.scss';

export default function Header() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const locale = useLocale();
  const theme = useMantineTheme();
  const messages = useMessages();

  const mockdata = [
    {
      icon: Bookmark,
      title: messages.header.feature.allbookmark.title,
      description: messages.header.feature.allbookmark.description,
    },
    {
      icon: AtSign,
      title: messages.header.feature.atproto.title,
      description: messages.header.feature.atproto.description,
    },
    {
      icon: FileText,
      title: messages.header.feature.ownerbenefit.title,
      description: messages.header.feature.ownerbenefit.description,
    }
  ];

  mockdata.map((item) => (
    <UnstyledButton className={classes.subLink} key={item.title}>
      <Group wrap="nowrap" align="flex-start">
        <ThemeIcon size={34} variant="default" radius="md">
          <item.icon size={22} color={theme.colors.blue[6]} />
        </ThemeIcon>
        <div>
          <Text size="sm" fw={500}>
            {item.title}
          </Text>
          <Text size="xs" c="dimmed">
            {item.description}
          </Text>
        </div>
      </Group>
    </UnstyledButton>
  ));


  return (
    <Box>
      <header className={classes.header}>
        <Group justify="space-between" h="100%">
          <Group align="center" gap="sm">
            <Bookmark color={theme.colors.blue[6]} />
            <Text><Link href={`/${locale}/`} className={classes.title}>{messages.title}</Link></Text>
          </Group>

          <Group h="100%" gap={0} visibleFrom="sm" className={classes.center}>

            <Link href={`/${locale}/my/bookmark`} className={classes.link}>
              {messages.header.bookmark}
            </Link>


            <Link href={`/${locale}/bookmark/search`} className={classes.link}>
              {messages.header.browse}
            </Link>

            <Link href={`/${locale}/about`} className={classes.link}>
              {messages.header.about}
            </Link>
          </Group>

          <Group visibleFrom="sm">
            <LoginButtonOrUser closeDrawer={closeDrawer} />
            <LanguageToggle />
            <SwitchColorMode />
          </Group>

          <Burger opened={drawerOpened} onClick={toggleDrawer} hiddenFrom="sm" />
        </Group>
      </header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        position="right"
        size="100%"
        padding="md"
        title={messages.header.navigation}
        hiddenFrom="sm"
        zIndex={100}
      >
        <ScrollArea h="calc(100vh - 80px" mx="-md">

          <Divider my="sm" />

          <Stack pl="md" gap={1}>
            <Link href={`/${locale}/my/bookmark`} className={classes.link} onClick={closeDrawer}>
              {messages.header.bookmark}
            </Link>
            <Link href={`/${locale}/bookmark/search`} className={classes.link} onClick={closeDrawer}>
              {messages.header.browse}
            </Link>
            <Link href={`/${locale}/about`} className={classes.link} onClick={closeDrawer}>
              {messages.header.about}
            </Link>
          </Stack>


          <Divider my="sm" />

          <Group align="center" justify="center" gap={12} style={{ width: '100%' }} >
            <LoginButtonOrUser closeDrawer={closeDrawer} />
            <LanguageToggle />
            <SwitchColorMode />
          </Group>

        </ScrollArea>
      </Drawer>
    </Box>
  );
}