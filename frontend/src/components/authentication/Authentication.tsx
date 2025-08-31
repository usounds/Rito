"use client";
import {
  Anchor,
  Button,
  Group,
  PaperProps,
  Stack,
  TextInput
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMessages } from 'next-intl';
import { getClientMetadata } from '@/logic/HandleOauth'
import type { Did } from '@atcute/lexicons';
import { notifications } from '@mantine/notifications';
import { configureOAuth, createAuthorizationUrl, IdentityMetadata, AuthorizationServerMetadata, resolveFromIdentity } from '@atcute/oauth-browser-client';
import { resolveHandleViaDoH, resolveHandleViaHttp } from '@/logic/HandleDidredolver';
import { HiX } from "react-icons/hi";
import { useEffect, useState } from "react";

export function Authentication(props: PaperProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const messages = useMessages();

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const form = useForm({
    initialValues: {
      handle: '',
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
    const serverMetadata = getClientMetadata();
    configureOAuth({
      metadata: {
        client_id: serverMetadata.client_id || '',
        redirect_uri: serverMetadata.redirect_uris[0] || '',
      },
    });

    let identity: IdentityMetadata, metadata: AuthorizationServerMetadata, did: Did | null = null;

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
            icon: <HiX />
          });
          setIsLoading(false);
          return;
        }
      }

      // DIDからDid DocumentとPDSのOAuth Metadataを取得
      const resolved = await resolveFromIdentity(did);
      identity = resolved.identity
      metadata = resolved.metadata

      // rawはhandleに上書き
      identity.raw = values.handle

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
        icon: <HiX />
      });
      setIsLoading(false);
      return;
    }


    let host;
    if (identity.pds.host.endsWith('.bsky.network')) {
      host = 'bsky.social'
    } else {
      host = identity.pds.host
    }

    const message = messages.login.redirect.replace("{1}", host)
    window.localStorage.setItem('oauth.handle', values.handle)
    window.localStorage.setItem('oauth.redirecturl', window.location.href);

    notifications.update({
      id: 'login-process',
      title: messages.login.title,
      message: message,
      loading: true,
      autoClose: false
    });

    let authUrl;
    try {
      authUrl = await createAuthorizationUrl({
        metadata: metadata,
        identity: identity,
        scope: 'atproto transition:generic',
      });
    } catch (e) {
      console.error('createAuthorizationUrl error:', e);
      notifications.clean()
      notifications.show({
        title: 'Error',
        message: 'Failed to create authorization URL',
        color: 'red',
        icon: <HiX />
      });
      setIsLoading(false);
      return;
    }

    // recommended to wait for the browser to persist local storage before proceeding
    await sleep(200);

    // redirect the user to sign in and authorize the app
    window.location.assign(authUrl);

    // if this is on an async function, ideally the function should never ever resolve.
    // the only way it should resolve at this point is if the user aborted the authorization
    // by returning back to this page (thanks to back-forward page caching)
    await new Promise((_resolve, reject) => {
      const listener = () => {
        reject(new Error(`user aborted the login request`));
      };

      window.addEventListener('pageshow', listener, { once: true });

    })

  }


  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput
          required
          label={messages.login.handle}
          placeholder="alice.bsky.social"
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
        <Button type="submit" radius="xl" loading={isLoading}>
          {messages.login.title}
        </Button>
      </Group>
    </form>
  );
}