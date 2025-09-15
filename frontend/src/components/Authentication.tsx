"use client";
import { resolveHandleViaDoH, resolveHandleViaHttp } from '@/logic/HandleDidredolver';
import { getClientMetadata } from '@/logic/HandleOauth';
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import type { Did } from '@atcute/lexicons';
import { AuthorizationServerMetadata, configureOAuth, IdentityMetadata } from '@atcute/oauth-browser-client';
import {
  Anchor,
  Button,
  Group,
  PaperProps,
  Stack,
  Switch,
  TextInput
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { X } from 'lucide-react';
import { useLocale, useMessages } from 'next-intl';
import { useState } from "react";

export function Authentication(props: PaperProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [checked, setChecked] = useState(false);
  const handle = useXrpcAgentStore(state => state.handle);
  const setHandle = useXrpcAgentStore(state => state.setHandle);
  const messages = useMessages();
  const locale = useLocale();

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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

    let did: Did | null = null;

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
        did = await resolveHandleViaHttp(values.handle);
      } catch (e) {
        console.warn('HTTP resolve failed, trying DoH:', e);
        try {
          // DoH 解決
          did = await resolveHandleViaDoH(values.handle);
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

      window.location.href = `/api/oauth/login?handle=${encodeURIComponent(values.handle)}&returnTo=${encodeURIComponent(window.location.href)}`;

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
      // ここで通知や UI 処理
    } finally {
      setIsLoading(false);
    }

  }


  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Switch
          checked={checked}
          label={messages.login.field.agree.title}
          onChange={(event) => setChecked(event.currentTarget.checked)}
        />

        <TextInput
          required
          label={messages.login.field.handle.title}
          placeholder={messages.login.field.handle.placeholder}
          value={form.values.handle}
          onChange={(event) => form.setFieldValue('handle', event.currentTarget.value)}
          error={form.errors.handle}
          radius="md"
          styles={{
            input: {
              fontSize: 16,  // 16pxに設定
            },
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
        <Button type="submit" radius="xl" loading={isLoading} disabled={!checked}>
          {messages.login.button.login}
        </Button>
      </Group>
    </form>
  );
}