"use client";
import { resolveHandleViaDoH, resolveHandleViaHttp } from '@/logic/HandleDidredolver';
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import {
  Anchor,
  Button,
  Group,
  Stack,
  Switch,
  Autocomplete,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { X } from 'lucide-react';
import { useLocale, useMessages } from 'next-intl';
import { useState } from "react";
import Link from 'next/link';
import { FaBluesky } from "react-icons/fa6";
import { useTopLoader } from 'nextjs-toploader';

export function Authentication() {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const publicAgent = useXrpcAgentStore(state => state.publicAgent);
  const setIsLoginProcess = useXrpcAgentStore(state => state.setIsLoginProcess);
  const [checked, setChecked] = useState(false);
  const handle = useXrpcAgentStore(state => state.handle);
  const setHandle = useXrpcAgentStore(state => state.setHandle);
  const messages = useMessages();
  const locale = useLocale();
  const loader = useTopLoader();

  const form = useForm({
    initialValues: {
      handle: handle || '',
    },

    validate: {
      handle: (val) => {
        if (/\s/.test(val)) {
          return messages.login.error.whitespace;
        }
        if (!val.includes('.')) {
          return messages.login.error.notdomain;
        }
        if (!/^[\x00-\x7F]+$/.test(val)) {
          return messages.login.error.multibyte;
        }
        return null;
      },
    },
  });

  async function handleSubmit(values: typeof form.values) {
    console.log('handleSubmit')
    setIsLoading(true);

    notifications.show({
      id: 'login-process',
      title: messages.login.title,
      message: messages.login.didresolve,
      loading: true,
      autoClose: false
    });


    try {

      try {
        //　HTTP 解決
        await resolveHandleViaHttp(values.handle);
      } catch (e) {
        console.warn('HTTP resolve failed, trying DoH:', e);
        try {
          // DoH 解決
          await resolveHandleViaDoH(values.handle);
        } catch (e2) {
          console.error('DoH resolve failed:', e2);
          // 両方ダメなら通知出して終了
          notifications.update({
            id: 'login-process',
            title: 'Error',
            message: messages.login.error.invalidhandle,
            color: 'red',
            loading: false,
            autoClose: true,
            icon: <X />
          });
          setIsLoading(false);
          return;
        }
      }

      setHandle(values.handle)

    } catch (e) {
      // 想定外の例外キャッチ
      console.error('resolveFromIdentity unexpected error:', e);
      notifications.update({
        id: 'login-process',
        title: 'Error',
        message: 'Unexpected Error:' + e,
        color: 'red',
        loading: false,
        autoClose: true,
        icon: <X />
      });
      setIsLoading(false);
      return;
    }

    const message = messages.login.redirect

    notifications.update({
      id: 'login-process',
      title: messages.login.title,
      message: message,
      color: 'blue',
      loading: true,
      autoClose: false
    });

    try {
      const returnTo = window.location.href;
      loader.start()
      setIsLoginProcess(true)
      const url = `/api/oauth/login?handle=${encodeURIComponent(values.handle)}&returnTo=${encodeURIComponent(returnTo)}&locale=${locale}`;
      window.location.href = url;

    } catch (e) {
      notifications.update({
        id: 'login-process',
        title: 'Error',
        message: 'Unexpected Error:' + e,
        color: 'red',
        loading: false,
        autoClose: true,
        icon: <X />
      });
      setIsLoading(false);
    } finally {
      //なにもしない
    }

  }

  const linkStyle = {
    color: 'inherit',     // 親のテキスト色を引き継ぐ
  };

  const tosLink = (
    <Link
      href={`/${locale}/tos`}
      target="_blank"
      rel="noopener noreferrer"
      style={linkStyle}
    >
      {messages.header.termofuse}
    </Link>
  );

  const privacyLink = (
    <Link
      href={`/${locale}/privacy`}
      target="_blank"
      rel="noopener noreferrer"
      style={linkStyle}
    >
      {messages.header.privacypolicy}
    </Link>
  );


  const handleInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.currentTarget.value;

    console.log(val)

    if (!val) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await publicAgent.get("app.bsky.actor.searchActorsTypeahead", {
        params: {
          q: val,
          limit: 5,
        },
      });

      if (res.ok) {
        // actor.handle を候補として表示
        setSuggestions(res.data.actors.map((a) => a.handle));
      }
    } catch (err) {
      console.error("searchActorsTypeahead error", err);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Switch
          checked={checked}
          onChange={(event) => setChecked(event.currentTarget.checked)}
          label={
            <>
              {messages.login.field.agree.title} {tosLink} {privacyLink}
            </>
          }
        />

        <Autocomplete
          required
          label={messages.login.field.handle.title}
          placeholder={messages.login.field.handle.placeholder}
          value={form.values.handle}
          disabled={isLoading}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={(value) => {
            form.setFieldValue("handle", value);
            setSuggestions([]);
          }}
          error={form.errors.handle}
          onInput={handleInput}
          data={suggestions}
          radius="md"
          styles={{
            input: { fontSize: 16 },
          }}
        />
      </Stack>


      <Group justify="space-between" mt="xl">
        <Anchor
          component="a"
          href="https://bsky.app/"
          target="_blank"
          rel="noopener noreferrer"
          c="dimmed"
          size="xs"
        >
          {messages.login.create}
        </Anchor>
        <Button type="submit" radius="xl" loading={isLoading} disabled={!checked} leftSection={<FaBluesky />}>
          {messages.login.button.login}
        </Button>
      </Group>
    </form>
  );
}