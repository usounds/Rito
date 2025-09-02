"use client";
import { LoginButtonOrUser } from '@/components/header/LoginButtonOrUser';
import LanguageToggle from '@/components/LanguageToggle';
import { SwitchColorMode } from '@/components/SwitchColorMode';
import {
  Box,
  Burger,
  Button,
  Center,
  Collapse,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  Text,
  ThemeIcon,
  UnstyledButton,
  useMantineTheme
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChevronDown
} from '@tabler/icons-react';
import { useMessages } from 'next-intl';
import { useState } from 'react';
import { CiAt, CiBookmark, CiFileOn } from "react-icons/ci";
import { FaBookmark } from "react-icons/fa";
import classes from './Header.module.scss';

export default function Header() {
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false);
  const [linksOpened, { toggle: toggleLinks }] = useDisclosure(false);
  const theme = useMantineTheme();
  const messages = useMessages();
  const [opened, setOpened] = useState(false);

  const mockdata = [
    {
      icon: CiBookmark,
      title: messages.header.feature.allbookmark.title,
      description: messages.header.feature.allbookmark.description,
    },
    {
      icon: CiAt,
      title: messages.header.feature.atproto.title,
      description: messages.header.feature.atproto.description,
    },
    {
      icon: CiFileOn,
      title: messages.header.feature.ownerbenefit.title,
      description: messages.header.feature.ownerbenefit.description,
    }
  ];

  const links = mockdata.map((item) => (
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
            <FaBookmark color={theme.colors.blue[6]} />
            <Text>{messages.title}</Text>
          </Group>

          <Group h="100%" gap={0} visibleFrom="sm" className={classes.center}>

            <a href="#" className={classes.link}>
              {messages.header.bookmark}
            </a>

            <a href="#" className={classes.link}>
              {messages.header.browse}
            </a>
            <a href="#" className={classes.link}>
              {messages.header.termofuse}
            </a>
            <a href="#" className={classes.link}>
              {messages.header.privacypolicy}
            </a>
          </Group>

          <Group visibleFrom="sm">
            <LoginButtonOrUser />
            <LanguageToggle />
            <SwitchColorMode />
          </Group>

          <Burger opened={drawerOpened} onClick={toggleDrawer} hiddenFrom="sm" />
        </Group>
      </header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        size="100%"
        padding="md"
        title={messages.title}
        hiddenFrom="sm"
        zIndex={1000000}
      >
        <ScrollArea h="calc(100vh - 80px" mx="-md">

          <Divider my="sm" />

          <a href="#" className={classes.link}>
            {messages.header.bookmark}
          </a>

          <a href="#" className={classes.link}>
            {messages.header.browse}
          </a>
          <UnstyledButton className={classes.link} onClick={toggleLinks}>
            <Center inline>
              <Box component="span" mr={5}>
                {messages.header.feature.title}
              </Box>
              <IconChevronDown size={16} color={theme.colors.blue[6]} />
            </Center>
          </UnstyledButton>
          <Collapse in={linksOpened}>{links}</Collapse>
          <a href="#" className={classes.link}>
            {messages.header.termofuse}
          </a>
          <a href="#" className={classes.link}>
            {messages.header.privacypolicy}
          </a>


          <Divider my="sm" />

          <Group justify="center" grow pb="xl" px="md">
            <Button
              variant="default"
              onClick={() => {
                toggleDrawer();
                setOpened(true);
              }}
            >{messages.login.title}</Button>
          </Group>

          <Group align="center" justify="center" gap={12} style={{ width: '100%' }}>
            <LanguageToggle />
            <SwitchColorMode />
          </Group>

        </ScrollArea>
      </Drawer>
    </Box>
  );
}